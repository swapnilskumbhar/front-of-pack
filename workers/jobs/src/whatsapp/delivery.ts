import { decryptIdentifier } from "./crypto.ts";
import { GraphSendError, sendWhatsAppText, type GraphConfig } from "./graph.ts";
import { formatClaimSignal, formatWholePackSignal, type DerivedSignal } from "../../../../src/engine/index.ts";
import type { LanguageCode } from "../../../../src/domain/language.ts";

export interface DeliveryJob { version: 1; whatsapp_job_id: string }
export interface DeliveryEnv extends GraphConfig {
  DB: D1Database;
  DELIVERY_ENCRYPTION_KEY: string;
}

export function parseDeliveryJob(value: unknown): DeliveryJob | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return row.version === 1 && typeof row.whatsapp_job_id === "string" && row.whatsapp_job_id.length > 0 &&
    Object.keys(row).every((key) => key === "version" || key === "whatsapp_job_id")
    ? row as unknown as DeliveryJob : null;
}

export function renderWhatsAppChunks(result: unknown): string[] {
  const source = result && typeof result === "object" ? result as Record<string, unknown> : {};
  const sections: string[] = [];
  const language = (typeof source.language === "string" ? source.language : "en") as LanguageCode;
  const derived = source.derived && typeof source.derived === "object" ? source.derived as Record<string, unknown> : {};
  const derivedItems = Array.isArray(derived.items) ? derived.items : [];
  if (Array.isArray(source.items)) {
    for (const value of source.items) {
      if (!value || typeof value !== "object") continue;
      const item = value as Record<string, unknown>;
      const identity = item.identity && typeof item.identity === "object"
        ? item.identity as Record<string, unknown> : {};
      const name = [identity.brandAsPrinted, identity.nameAsPrinted, identity.variantAsPrinted]
        .filter((part): part is string => typeof part === "string" && part.length > 0).join(" — ");
      const findings = Array.isArray(item.findings)
        ? item.findings.filter((finding) => finding && typeof finding === "object") as Record<string, unknown>[] : [];
      const orderedFindings = [...findings].sort((left, right) =>
        Number(right.level === "attention") - Number(left.level === "attention"));
      const derivedItem = derivedItems.find((candidate) => candidate && typeof candidate === "object" &&
        (candidate as Record<string, unknown>).position === item.position) as Record<string, unknown> | undefined;
      const signal = Array.isArray(derivedItem?.signals) ? derivedItem.signals[0] as DerivedSignal | undefined : undefined;
      const primary = orderedFindings[0];
      if (signal?.kind === "whole_pack_rda" || signal?.kind === "claim_contradiction") {
        const copy = signal.kind === "whole_pack_rda" ? formatWholePackSignal(signal, language) : formatClaimSignal(signal, language);
        sections.push(`⚠️ *${copy.title}*\n${copy.headline}\n${copy.detail}`);
      } else if (primary) {
        const title = typeof primary.title === "string" ? primary.title.toUpperCase() : "WHAT MATTERS";
        const explanation = typeof primary.explanation === "string" ? primary.explanation : "";
        sections.push(`${primary.level === "attention" ? "⚠️" : "ℹ️"} *${title}*${explanation ? `\n${explanation}` : ""}`);
      } else if (typeof source.strongestMaterialFinding === "string") {
        sections.push(`ℹ️ *WHAT MATTERS*\n${source.strongestMaterialFinding}`);
      } else if (typeof source.wholeImageSummary === "string") {
        sections.push(source.wholeImageSummary);
      }
      if (name) sections.push(`📦 ${name}`);
      if (Array.isArray(item.findings)) {
        for (const findingValue of orderedFindings.slice(signal ? 0 : 1, signal ? 2 : 3)) {
          if (!findingValue || typeof findingValue !== "object") continue;
          const finding = findingValue as Record<string, unknown>;
          const title = typeof finding.title === "string" ? finding.title : "";
          const explanation = typeof finding.explanation === "string" ? finding.explanation : "";
          if (title || explanation) sections.push(`• ${title}${title && explanation ? ": " : ""}${explanation}`);
        }
      }
      const onlineEvidence = Array.isArray(item.evidence)
        ? item.evidence.find((candidate) => candidate && typeof candidate === "object" &&
          (candidate as Record<string, unknown>).origin === "hosted_web_search") as Record<string, unknown> | undefined
        : undefined;
      const onlineCitation = Array.isArray(item.citations)
        ? item.citations.find((candidate) => candidate && typeof candidate === "object" &&
          typeof (candidate as Record<string, unknown>).url === "string") as Record<string, unknown> | undefined
        : undefined;
      if (onlineEvidence) {
        const observation = typeof onlineEvidence.excerptOrObservation === "string" ? onlineEvidence.excerptOrObservation : "";
        const sourceUrl = typeof onlineCitation?.url === "string" ? onlineCitation.url : "";
        sections.push(`🌐 *ONLINE MATCH — VERIFY PACK*${observation ? `\n${observation}` : ""}${sourceUrl ? `\n${sourceUrl}` : ""}`);
      }
    }
  }
  if (sections.length === 0 && typeof source.wholeImageSummary === "string") sections.push(source.wholeImageSummary);
  if (sections.length === 0 && typeof source.summary === "string") sections.push(source.summary);
  const summary = sections.length > 0 ? sections.join("\n\n") : "Your label analysis is ready.";
  const codePoints = Array.from(summary);
  return [codePoints.slice(0, 700).join("") || "Your label analysis is ready."];
}

export async function consumeDelivery(
  message: Pick<Message<unknown>, "body" | "ack"> & Partial<Pick<Message<unknown>, "retry">>,
  env: DeliveryEnv, fetcher: typeof fetch = fetch,
): Promise<void> {
  const job = parseDeliveryJob(message.body);
  if (!job) throw new Error("invalid_delivery_job");
  const row = await env.DB.prepare(`
    SELECT w.recipient_ciphertext, w.recipient_nonce, w.status, w.send_attempts, w.expires_at, a.result_json
    FROM whatsapp_jobs w JOIN scan_requests s ON s.id = w.scan_request_id
    JOIN analyses a ON a.id = s.analysis_id WHERE w.id = ? LIMIT 1
  `).bind(job.whatsapp_job_id).first<{
    recipient_ciphertext: ArrayBuffer | null; recipient_nonce: ArrayBuffer | null;
    status: string; send_attempts: number; expires_at: string; result_json: string | null;
  }>();
  if (!row || row.status === "sent" || row.status === "processing" || row.status === "failed") { message.ack(); return; }
  if (Date.parse(row.expires_at) <= Date.now()) {
    await clearWhatsAppCiphertext(env.DB, job.whatsapp_job_id, "delivery_expired");
    message.ack();
    return;
  }
  if (row.status !== "ready") { message.ack(); return; }
  const claim = await env.DB.prepare(`UPDATE whatsapp_jobs SET status = 'processing', send_attempts = send_attempts + 1,
    last_error_code = NULL WHERE id = ? AND status = 'ready' AND send_attempts < 3 AND expires_at > ?`)
    .bind(job.whatsapp_job_id, new Date().toISOString()).run();
  if ((claim.meta?.changes ?? 0) !== 1) { message.ack(); return; }
  if (!row.recipient_ciphertext || !row.recipient_nonce || !row.result_json) {
    await clearWhatsAppCiphertext(env.DB, job.whatsapp_job_id, "delivery_state_missing");
    message.ack(); return;
  }
  try {
    const recipient = await decryptIdentifier(row.recipient_ciphertext, row.recipient_nonce, env.DELIVERY_ENCRYPTION_KEY);
    await sendWhatsAppText(recipient, renderWhatsAppChunks(JSON.parse(row.result_json))[0], env, fetcher);
  } catch (error) {
    if (error instanceof GraphSendError && error.retryable) {
      await env.DB.prepare(`UPDATE whatsapp_jobs SET status = CASE WHEN send_attempts < 3 THEN 'ready' ELSE 'failed' END,
        last_error_code = ?, completed_at = CASE WHEN send_attempts < 3 THEN NULL ELSE ? END,
        recipient_ciphertext = CASE WHEN send_attempts < 3 THEN recipient_ciphertext ELSE NULL END,
        recipient_nonce = CASE WHEN send_attempts < 3 THEN recipient_nonce ELSE NULL END,
        media_id_ciphertext = CASE WHEN send_attempts < 3 THEN media_id_ciphertext ELSE NULL END,
        media_id_nonce = CASE WHEN send_attempts < 3 THEN media_id_nonce ELSE NULL END
        WHERE id = ? AND status = 'processing'`)
        .bind(error.message, new Date().toISOString(), job.whatsapp_job_id).run();
      if (row.send_attempts + 1 < 3) {
        if (message.retry) message.retry({ delaySeconds: 30 });
        else throw error;
      } else {
        message.ack();
      }
      return;
    }
    await clearWhatsAppCiphertext(env.DB, job.whatsapp_job_id,
      error instanceof GraphSendError ? error.message : "delivery_ambiguous");
    message.ack(); return;
  }
  await env.DB.prepare(`UPDATE whatsapp_jobs SET status = 'sent', completed_at = ?, recipient_ciphertext = NULL,
    recipient_nonce = NULL, media_id_ciphertext = NULL, media_id_nonce = NULL WHERE id = ? AND status = 'processing'`)
    .bind(new Date().toISOString(), job.whatsapp_job_id).run();
  message.ack();
}

export async function clearWhatsAppCiphertext(db: D1Database, jobId: string, code: string): Promise<void> {
  await db.prepare(`UPDATE whatsapp_jobs SET status = 'failed', last_error_code = ?, completed_at = ?,
    recipient_ciphertext = NULL, recipient_nonce = NULL, media_id_ciphertext = NULL, media_id_nonce = NULL
    WHERE id = ? AND status NOT IN ('sent','failed')`).bind(code, new Date().toISOString(), jobId).run();
}

export async function cleanupExpiredWhatsAppJobs(db: D1Database): Promise<void> {
  await db.prepare(`UPDATE whatsapp_jobs SET status = 'failed', last_error_code = 'job_expired', completed_at = ?,
    recipient_ciphertext = NULL, recipient_nonce = NULL, media_id_ciphertext = NULL, media_id_nonce = NULL
    WHERE expires_at <= ? AND status NOT IN ('sent','failed')`)
    .bind(new Date().toISOString(), new Date().toISOString()).run();
}
