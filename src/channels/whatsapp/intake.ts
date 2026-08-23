import type { QueueLike } from "../../intake/contracts.ts";
import { encryptIdentifier, hmacHex } from "./crypto.ts";
import { WhatsAppRepository, type WhatsAppAnalysisJob } from "./repository.ts";
import type { WhatsAppEvent } from "./webhook.ts";
import type { D1DatabaseLike } from "../../data/d1.ts";
import type { LanguageCode } from "../../domain/language.ts";

const LANGUAGE_ALIASES: ReadonlyMap<string, LanguageCode> = new Map([
  ["en", "en"], ["english", "en"],
  ["hi", "hi"], ["hindi", "hi"], ["हिन्दी", "hi"], ["हिंदी", "hi"],
  ["mr", "mr"], ["marathi", "mr"], ["मराठी", "mr"],
  ["bn", "bn"], ["bengali", "bn"], ["bangla", "bn"], ["বাংলা", "bn"],
  ["ta", "ta"], ["tamil", "ta"], ["தமிழ்", "ta"],
  ["te", "te"], ["telugu", "te"], ["తెలుగు", "te"],
  ["kn", "kn"], ["kannada", "kn"], ["ಕನ್ನಡ", "kn"],
  ["gu", "gu"], ["gujarati", "gu"], ["ગુજરાતી", "gu"],
  ["ml", "ml"], ["malayalam", "ml"], ["മലയാളം", "ml"],
  ["pa", "pa"], ["punjabi", "pa"], ["ਪੰਜਾਬੀ", "pa"],
  ["or", "or"], ["odia", "or"], ["oriya", "or"], ["ଓଡ଼ିଆ", "or"],
  ["ur", "ur"], ["urdu", "ur"], ["اردو", "ur"],
]);

export interface WhatsAppIntakeBindings {
  DB: D1DatabaseLike;
  ANALYSIS_QUEUE: QueueLike<WhatsAppAnalysisJob>;
  PROFILE_HMAC_SECRET: string;
  DELIVERY_ENCRYPTION_KEY: string;
}

export async function persistAndEnqueueWhatsAppEvents(
  events: readonly WhatsAppEvent[], bindings: WhatsAppIntakeBindings,
): Promise<void> {
  const repository = new WhatsAppRepository(bindings.DB);
  for (const event of events) {
    if (event.kind === "status") continue;
    if (event.kind === "text") {
      const language = parseWhatsAppLanguageSelection(event.text);
      if (language) {
        const now = new Date().toISOString();
        const subjectDigest = await hmacHex(bindings.PROFILE_HMAC_SECRET, event.sender);
        const profile = await repository.ensureProfile(subjectDigest, now);
        await repository.setProfileLanguage(profile.profileId, language, now);
      }
      continue;
    }
    if (event.kind !== "image") continue;
    const existing = await repository.findJob(event.messageId);
    if (existing) {
      if (existing.status === "received") {
        await bindings.ANALYSIS_QUEUE.send({ version: 1, trigger: "whatsapp", whatsapp_job_id: existing.id });
        await repository.markQueued(existing.id);
      }
      continue;
    }
    const now = new Date().toISOString();
    const subjectDigest = await hmacHex(bindings.PROFILE_HMAC_SECRET, event.sender);
    const profile = await repository.ensureProfile(subjectDigest, now);
    const recipient = await encryptIdentifier(event.sender, bindings.DELIVERY_ENCRYPTION_KEY);
    const media = await encryptIdentifier(event.mediaId, bindings.DELIVERY_ENCRYPTION_KEY);
    const id = crypto.randomUUID();
    await repository.insertImageJob({
      id, messageId: event.messageId,
      payloadDigest: await hmacHex(bindings.PROFILE_HMAC_SECRET, `${event.messageId}:${event.mediaId}`),
      profileId: profile.profileId,
      recipientCiphertext: recipient.ciphertext, recipientNonce: recipient.nonce,
      mediaCiphertext: media.ciphertext, mediaNonce: media.nonce,
      language: profile.language,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), now,
    });
    const stored = await repository.findJob(event.messageId);
    if (!stored) throw new Error("whatsapp_job_persistence_failed");
    await bindings.ANALYSIS_QUEUE.send({ version: 1, trigger: "whatsapp", whatsapp_job_id: stored.id });
    await repository.markQueued(stored.id);
  }
}

export function parseWhatsAppLanguageSelection(text: string): LanguageCode | null {
  const normalized = text.trim().toLocaleLowerCase("en-IN")
    .replace(/^(?:language|lang)\s*[:=-]?\s*/u, "")
    .replace(/[.!]+$/u, "")
    .trim();
  return LANGUAGE_ALIASES.get(normalized) ?? null;
}
