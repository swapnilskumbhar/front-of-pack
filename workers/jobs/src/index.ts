import { AnalysisRepository } from "../../../src/data/analysis-repository.ts";
import { validateAnalysisResult } from "../../../src/validation/analysis-result.ts";
import {
  ENABLED_RULE_PACK_ID_SET,
  ENABLED_SERVICE_ID_SET,
  RULE_PACKS,
  SERVICE_DIRECTORY,
} from "../../../src/knowledge/index.ts";
import { callTerraOnce } from "./openai/client.ts";
import { TerraError } from "./openai/errors.ts";
import type { TerraProviderResult } from "./openai/types.ts";
import { prepareWhatsAppAnalysis, parseWhatsAppAnalysisJob } from "./whatsapp/analysis.ts";
import { cleanupExpiredWhatsAppJobs, consumeDelivery, sendWhatsAppAnalysisFailure } from "./whatsapp/delivery.ts";
import { attachDecisions } from "../../../src/engine/index.ts";

const PINNED_ANALYSIS_VERSIONS = {
  model_id: "gpt-5.6-terra",
  prompt_version: "terra-analysis.v9",
  schema_version: "analysis-result.v1",
  rules_version: "india-category-rules.v2",
  services_version: "india-consumer-services.v1",
  engine_version: "decision-engine.v3",
} as const;

const MODEL_RULE_CONTEXT = RULE_PACKS.map((pack) => ({
  id: pack.id,
  status: pack.status,
  categories: pack.categories,
  coverageTier: pack.coverageTier,
  context: pack.machineContext,
  source: pack.source.url,
  limitations: pack.limitations.slice(0, 2),
}));

const MODEL_SERVICE_DIRECTORY = SERVICE_DIRECTORY.map((service) => ({
  id: service.id,
  categories: service.categories,
  purposes: service.purposes,
  url: service.url,
  routingConstraints: service.routingConstraints,
  limitations: service.limitations.slice(0, 1),
}));

export interface WebAnalysisQueueMessage {
  version: 1;
  trigger: "web";
  analysis_id: string;
  attempt_number: number;
}

export interface Env {
  ENVIRONMENT: string;
  DB: D1Database;
  MEDIA: R2Bucket;
  IMAGES: import("../../../src/intake/contracts.ts").ImagesBindingLike;
  OPENAI_API_KEY?: string;
  MODEL_ANALYSIS?: string;
  TERRA_REASONING_EFFORT?: "none" | "low" | "medium" | "high";
  DELIVERY_QUEUE: Queue<{ version: 1; whatsapp_job_id: string }>;
  DELIVERY_ENCRYPTION_KEY?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_GRAPH_VERSION?: string;
}

type AnalysisMessage = Pick<Message<unknown>, "body" | "ack"> & Partial<Pick<Message<unknown>, "retry">>;

export function parseWebAnalysisMessage(value: unknown): WebAnalysisQueueMessage | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const message = value as Record<string, unknown>;
  if (
    message.version !== 1 || message.trigger !== "web" ||
    typeof message.analysis_id !== "string" || message.analysis_id.length === 0 ||
    !Number.isInteger(message.attempt_number) || (message.attempt_number as number) < 1
  ) return null;
  const exactKeys = ["analysis_id", "attempt_number", "trigger", "version"];
  return Object.keys(message).every((key) => exactKeys.includes(key))
    ? message as unknown as WebAnalysisQueueMessage : null;
}

function contentType(object: R2ObjectBody): string {
  const candidate = object.httpMetadata?.contentType;
  return typeof candidate === "string" && candidate.startsWith("image/")
    ? candidate : "image/jpeg";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function errorDetails(error: unknown): { code: string; error: Record<string, unknown> } {
  if (error instanceof TerraError) {
    return {
      code: `terra_${error.code}`,
      error: { name: error.name, message: error.message, status: error.status, responseId: error.responseId },
    };
  }
  if (error instanceof Error) {
    return { code: "analysis_processing_failed", error: { name: error.name, message: error.message } };
  }
  return { code: "analysis_processing_failed", error: { message: "Unknown processing failure" } };
}

async function persistFailure(
  repository: AnalysisRepository,
  db: D1Database,
  job: WebAnalysisQueueMessage,
  error: unknown,
): Promise<void> {
  const details = errorDetails(error);
  try {
    await repository.markFailed(job.analysis_id, job.attempt_number, {
      errorCode: details.code,
      error: details.error,
      completedAt: new Date().toISOString(),
    });
  } catch {
    // Best-effort explicit terminal marker for the ambiguous case where the
    // provider ran but normal completion/failure persistence did not succeed.
    try {
      await db.prepare(`
        UPDATE analyses
        SET status = 'failed', error_code = 'post_claim_persistence_ambiguous',
          error_json = '{"nonRetryable":true}', completed_at = ?
        WHERE id = ? AND attempt_number = ? AND status = 'processing'
          AND provider_started_at IS NOT NULL
      `).bind(new Date().toISOString(), job.analysis_id, job.attempt_number).run();
    } catch {
      // The message is still acknowledged: a provider-started attempt is never
      // automatically replayed, even when D1 itself is unavailable.
    }
  }
}

function assertProviderSources(result: TerraProviderResult<unknown>): void {
  const returnedById = new Map(result.searchSources.flatMap((source) =>
    source.id === null ? [] : [[source.id, source] as const]
  ));
  const analysis = result.result as { items?: Array<{
    citations?: Array<{ id?: unknown; url?: unknown; providerSourceId?: unknown }>;
    evidence?: Array<{ origin?: unknown; citationId?: unknown }>;
  }> };
  for (const item of analysis.items ?? []) {
    const citations = new Map((item.citations ?? []).flatMap((citation) =>
      typeof citation.id === "string" ? [[citation.id, citation] as const] : []
    ));
    for (const evidence of item.evidence ?? []) {
      if (evidence.origin !== "hosted_web_search" || typeof evidence.citationId !== "string") continue;
      const citation = citations.get(evidence.citationId);
      if (!citation || typeof citation.providerSourceId !== "string" || citation.providerSourceId.length === 0) {
        throw new Error("Hosted-search evidence is missing its provider source id");
      }
      if (typeof citation.url !== "string") {
        throw new Error("Hosted-search citation does not match the provider source id and URL");
      }
      const citationUrl = canonicalSourceUrl(citation.url);
      const sourceById = returnedById.get(citation.providerSourceId);
      const sourceByUrl = result.searchSources.find((candidate) => canonicalSourceUrl(candidate.url) === citationUrl);
      const providerIdAsUrl = canonicalSourceUrl(citation.providerSourceId);
      const source = sourceById ?? (providerIdAsUrl === citationUrl ? sourceByUrl : undefined);
      if (!source || canonicalSourceUrl(source.url) !== citationUrl) {
        throw new Error("Hosted-search citation does not match the provider source id and URL");
      }
    }
  }
}

function canonicalSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
    return url.toString();
  } catch {
    return null;
  }
}

async function assertPinnedAnalysisVersions(db: D1Database, analysisId: string): Promise<void> {
  const row = await db.prepare(`
    SELECT model_id, prompt_version, schema_version, rules_version, services_version, engine_version
    FROM analyses WHERE id = ? LIMIT 1
  `).bind(analysisId).first<Record<keyof typeof PINNED_ANALYSIS_VERSIONS, string>>();
  if (row === null) throw new Error("Queued analysis version metadata is missing");
  for (const [field, expected] of Object.entries(PINNED_ANALYSIS_VERSIONS)) {
    if (row[field as keyof typeof PINNED_ANALYSIS_VERSIONS] !== expected) {
      throw new Error(`Queued analysis ${field} is not supported by this worker`);
    }
  }
}

/** Processes one web job. Returning normally acknowledges every post-claim outcome. */
export async function consumeWebAnalysis(
  message: AnalysisMessage,
  env: Env,
  fetcher: typeof fetch = fetch,
  initialTimings: Record<string, number> = {},
  requireWebSearch = false,
): Promise<void> {
  const job = parseWebAnalysisMessage(message.body);
  if (job === null) throw new Error("Invalid web analysis queue message");

  const repository = new AnalysisRepository(env.DB);
  const analysis = await repository.findById(job.analysis_id);
  if (analysis === null) throw new Error("Queued analysis is missing");
  if (
    analysis.status !== "queued" ||
    analysis.attemptNumber !== job.attempt_number ||
    analysis.providerStartedAt !== null
  ) {
    message.ack();
    return;
  }
  await assertPinnedAnalysisVersions(env.DB, job.analysis_id);
  if (analysis.mediaObjectKey === null) {
    throw new Error("Queued analysis media reference is missing");
  }
  const media = await env.MEDIA.get(analysis.mediaObjectKey);
  if (media === null) throw new Error("Queued analysis media is missing");

  const claimed = await repository.claimProvider(job.analysis_id, job.attempt_number, new Date().toISOString());
  if (!claimed) {
    message.ack();
    return;
  }

  try {
    const imageBytes = new Uint8Array(await media.arrayBuffer());
    const providerStartedAtMs = Date.now();
    const provider = await callTerraOnce(env, {
      imageUrl: `data:${contentType(media)};base64,${bytesToBase64(imageBytes)}`,
      language: analysis.language,
      verifiedRuleContext: MODEL_RULE_CONTEXT,
      verifiedServiceDirectory: MODEL_SERVICE_DIRECTORY,
      requireWebSearch,
    }, fetcher);
    const providerDurationMs = Date.now() - providerStartedAtMs;
    assertProviderSources(provider);
    const validation = validateAnalysisResult(provider.result, {
      allowedRuleIds: ENABLED_RULE_PACK_ID_SET,
      allowedServiceIds: ENABLED_SERVICE_ID_SET,
    });
    if (!validation.valid) {
      throw new Error(`Analysis validation failed: ${JSON.stringify(validation.errors)}`);
    }
    const completed = await repository.markComplete(job.analysis_id, job.attempt_number, {
      result: attachDecisions(provider.result),
      providerSources: provider.searchSources,
      validationReport: validation,
      timings: { ...initialTimings, providerDurationMs },
      tokenUsage: provider.usage,
      openAiResponseId: provider.responseId,
      webSearchUsed: provider.webSearchUsed,
      completedAt: new Date().toISOString(),
    });
    if (!completed) throw new Error("Claimed analysis could not be completed");
  } catch (error) {
    await persistFailure(repository, env.DB, job, error);
  } finally {
    try {
      await env.MEDIA.delete(analysis.mediaObjectKey);
    } catch {
      // The lifecycle rule is the orphan backstop; never retry the provider call.
    }
  }
  message.ack();
}

export default {
  fetch(request: Request, env: Env): Response {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        service: "front-of-pack-jobs", status: "ok", environment: env.ENVIRONMENT,
        providerConfigured: Boolean(env.OPENAI_API_KEY),
      });
    }
    return new Response("Not Found", { status: 404 });
  },

  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    if (batch.queue === "front-of-pack-delivery") {
      if (!env.DELIVERY_ENCRYPTION_KEY || !env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_GRAPH_VERSION) {
        throw new Error("WhatsApp delivery secrets are not configured");
      }
      for (const message of batch.messages) await consumeDelivery(message, {
        DB: env.DB, DELIVERY_ENCRYPTION_KEY: env.DELIVERY_ENCRYPTION_KEY,
        accessToken: env.WHATSAPP_ACCESS_TOKEN, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
        apiVersion: env.WHATSAPP_GRAPH_VERSION,
      });
      return;
    }
    if (batch.queue !== "front-of-pack-analysis") throw new Error(`Unsupported queue: ${batch.queue}`);
    for (const message of batch.messages) {
      const web = parseWebAnalysisMessage(message.body);
      if (web) { await consumeWebAnalysis(message, env); continue; }
      const whatsapp = parseWhatsAppAnalysisJob(message.body);
      if (!whatsapp || !env.DELIVERY_ENCRYPTION_KEY || !env.WHATSAPP_ACCESS_TOKEN ||
          !env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_GRAPH_VERSION) {
        throw new Error("Invalid or unconfigured WhatsApp analysis job");
      }
      const prepared = await prepareWhatsAppAnalysis(whatsapp, {
        DB: env.DB, MEDIA: env.MEDIA, IMAGES: env.IMAGES, DELIVERY_QUEUE: env.DELIVERY_QUEUE,
        DELIVERY_ENCRYPTION_KEY: env.DELIVERY_ENCRYPTION_KEY,
        accessToken: env.WHATSAPP_ACCESS_TOKEN, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
        apiVersion: env.WHATSAPP_GRAPH_VERSION,
      });
      if (!prepared.cacheHit) {
        await consumeWebAnalysis({ body: { version: 1, trigger: "web", analysis_id: prepared.analysisId,
          attempt_number: prepared.attemptNumber }, ack() {} }, env, fetch, prepared.preparationTimings, true);
      }
      const result = await env.DB.prepare(`SELECT status FROM analyses WHERE id = ? LIMIT 1`)
        .bind(prepared.analysisId).first<{ status: string }>();
      if (result?.status === "complete") {
        await env.DB.prepare(`UPDATE whatsapp_jobs SET status = 'ready' WHERE id = ? AND status IN ('queued','processing')`)
          .bind(whatsapp.whatsapp_job_id).run();
        await env.DELIVERY_QUEUE.send({ version: 1, whatsapp_job_id: whatsapp.whatsapp_job_id });
      } else if (result?.status === "failed") {
        await sendWhatsAppAnalysisFailure(whatsapp.whatsapp_job_id, {
          DB: env.DB, DELIVERY_ENCRYPTION_KEY: env.DELIVERY_ENCRYPTION_KEY,
          accessToken: env.WHATSAPP_ACCESS_TOKEN, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
          apiVersion: env.WHATSAPP_GRAPH_VERSION,
        });
        await env.DB.prepare(`UPDATE whatsapp_jobs SET status = 'failed', last_error_code = 'analysis_failed',
          media_id_ciphertext = NULL, media_id_nonce = NULL, recipient_ciphertext = NULL, recipient_nonce = NULL,
          completed_at = ? WHERE id = ?`).bind(new Date().toISOString(), whatsapp.whatsapp_job_id).run();
      } else if (result?.status === "queued" || result?.status === "processing") {
        if (!message.retry) throw new Error("analysis_pending_retry_unavailable");
        message.retry({ delaySeconds: 15 });
        continue;
      } else {
        throw new Error("analysis_state_invalid");
      }
      message.ack();
    }
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await cleanupExpiredWhatsAppJobs(env.DB);
  },
} satisfies ExportedHandler<Env>;
