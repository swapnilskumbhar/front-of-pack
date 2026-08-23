import { AnalysisRepository } from "../../../../src/data/analysis-repository.ts";
import { ANALYSIS_SCHEMA_VERSION } from "../../../../src/domain/analysis.ts";
import { buildAnalysisCacheKey, INTAKE_VERSION, isFresh, sha256Hex, validateImageBytes } from "../../../../src/intake/image.ts";
import { normalizeImage } from "../../../../src/intake/normalization.ts";
import type { ImagesBindingLike } from "../../../../src/intake/contracts.ts";
import { decryptIdentifier } from "./crypto.ts";
import { downloadWhatsAppMedia, type GraphConfig } from "./graph.ts";

export interface WhatsAppAnalysisJob { version: 1; trigger: "whatsapp"; whatsapp_job_id: string }
export interface WhatsAppAnalysisEnv extends GraphConfig {
  DB: D1Database; MEDIA: R2Bucket; DELIVERY_QUEUE: Queue<{ version: 1; whatsapp_job_id: string }>;
  IMAGES: ImagesBindingLike;
  DELIVERY_ENCRYPTION_KEY: string;
}

export function parseWhatsAppAnalysisJob(value: unknown): WhatsAppAnalysisJob | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return row.version === 1 && row.trigger === "whatsapp" && typeof row.whatsapp_job_id === "string" &&
    Object.keys(row).every((key) => ["version", "trigger", "whatsapp_job_id"].includes(key))
    ? row as unknown as WhatsAppAnalysisJob : null;
}

/** Prepares a WhatsApp image as the same queued analysis record used by web intake. */
export async function prepareWhatsAppAnalysis(
  job: WhatsAppAnalysisJob, env: WhatsAppAnalysisEnv, fetcher: typeof fetch = fetch,
): Promise<{ analysisId: string; attemptNumber: number; cacheHit: boolean; analysisStatus: string }> {
  const wa = await env.DB.prepare(`SELECT id, inbound_message_id, profile_id, language, status,
    media_id_ciphertext, media_id_nonce FROM whatsapp_jobs WHERE id = ? LIMIT 1`)
    .bind(job.whatsapp_job_id).first<{
      id: string; inbound_message_id: string; profile_id: string; language: string; status: string;
      media_id_ciphertext: ArrayBuffer | null; media_id_nonce: ArrayBuffer | null;
    }>();
  if (!wa) throw new Error("whatsapp_job_missing");
  const linked = await env.DB.prepare(`SELECT s.analysis_id FROM whatsapp_jobs w JOIN scan_requests s ON s.id = w.scan_request_id WHERE w.id = ? LIMIT 1`)
    .bind(wa.id).first<{ analysis_id: string }>();
  if (linked) {
    const analysis = await new AnalysisRepository(env.DB).findById(linked.analysis_id);
    if (!analysis) throw new Error("linked_analysis_missing");
    return { analysisId: analysis.id, attemptNumber: analysis.attemptNumber,
      cacheHit: analysis.status === "complete" && isFresh(analysis.expiresAt), analysisStatus: analysis.status };
  }
  if (!wa.media_id_ciphertext || !wa.media_id_nonce) throw new Error("encrypted_media_id_missing");
  const mediaId = await decryptIdentifier(wa.media_id_ciphertext, wa.media_id_nonce, env.DELIVERY_ENCRYPTION_KEY);
  const downloaded = await downloadWhatsAppMedia(mediaId, env, fetcher);
  const detectedMime = validateImageBytes(downloaded.bytes);
  if (downloaded.declaredMime && downloaded.declaredMime.split(";")[0] !== detectedMime) throw new Error("media_mime_mismatch");
  const normalized = await normalizeImage(downloaded.bytes, env.IMAGES);
  const imageHash = await sha256Hex(normalized.bytes);
  const cacheKey = await buildAnalysisCacheKey({ normalizedImageHash: imageHash, language: wa.language as never,
    modelId: INTAKE_VERSION.model, promptVersion: INTAKE_VERSION.prompt, schemaVersion: ANALYSIS_SCHEMA_VERSION,
    rulesVersion: INTAKE_VERSION.rules, servicesVersion: INTAKE_VERSION.services });
  const repository = new AnalysisRepository(env.DB);
  let analysis = await repository.findByCacheKey(cacheKey);
  if (analysis?.status === "failed") {
    const retryObjectKey = `analyses/${analysis.id}/${crypto.randomUUID()}`;
    await env.MEDIA.put(retryObjectKey, normalized.bytes, {
      httpMetadata: { contentType: normalized.mime },
      customMetadata: {
        normalization: normalized.normalizationVersion,
        retryAttempt: String(analysis.attemptNumber + 1),
      },
    });
    const retried = await repository.retry(
      analysis.id,
      analysis.attemptNumber,
      new Date().toISOString(),
      retryObjectKey,
    );
    if (!retried) await env.MEDIA.delete(retryObjectKey);
    analysis = await repository.findByCacheKey(cacheKey);
  }
  if (!analysis) {
    const analysisId = crypto.randomUUID();
    const objectKey = `analyses/${analysisId}/${crypto.randomUUID()}`;
    await env.MEDIA.put(objectKey, normalized.bytes, { httpMetadata: { contentType: normalized.mime },
      customMetadata: { normalization: normalized.normalizationVersion } });
    await repository.insertQueued({ id: analysisId, cacheKey, imageHash, mediaObjectKey: objectKey,
      language: wa.language as never, queueEnqueuedAt: new Date().toISOString(), modelId: INTAKE_VERSION.model,
      promptVersion: INTAKE_VERSION.prompt, schemaVersion: ANALYSIS_SCHEMA_VERSION, rulesVersion: INTAKE_VERSION.rules,
      servicesVersion: INTAKE_VERSION.services, createdAt: new Date().toISOString() });
    analysis = await repository.findByCacheKey(cacheKey);
  }
  if (!analysis) throw new Error("analysis_persistence_failed");
  const scanId = crypto.randomUUID();
  await env.DB.prepare(`INSERT OR IGNORE INTO scan_requests (id, profile_id, analysis_id, channel, idempotency_key, language, created_at)
    VALUES (?, ?, ?, 'whatsapp', ?, ?, ?)`)
    .bind(scanId, wa.profile_id, analysis.id, wa.inbound_message_id, wa.language, new Date().toISOString()).run();
  const scan = await env.DB.prepare(`SELECT id FROM scan_requests WHERE channel = 'whatsapp' AND idempotency_key = ? LIMIT 1`)
    .bind(wa.inbound_message_id).first<{ id: string }>();
  if (!scan) throw new Error("whatsapp_scan_persistence_failed");
  await env.DB.prepare(`UPDATE whatsapp_jobs SET scan_request_id = ?, status = 'processing' WHERE id = ?`)
    .bind(scan.id, wa.id).run();
  return { analysisId: analysis.id, attemptNumber: analysis.attemptNumber,
    cacheHit: analysis.status === "complete" && isFresh(analysis.expiresAt), analysisStatus: analysis.status };
}
