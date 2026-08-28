import type { D1DatabaseLike } from "../../data/d1.ts";
import { DEFAULT_LANGUAGE, type LanguageCode } from "../../domain/language.ts";

export interface WhatsAppAnalysisJob {
  version: 1;
  trigger: "whatsapp";
  whatsapp_job_id: string;
}

export class WhatsAppRepository {
  private readonly db: D1DatabaseLike;
  constructor(db: D1DatabaseLike) { this.db = db; }

  async ensureProfile(subjectDigest: string, now: string): Promise<{ profileId: string; language: LanguageCode }> {
    const existing = await this.db.prepare(`
      SELECT p.id, p.preferred_language
      FROM profile_identities i JOIN profiles p ON p.id = i.profile_id
      WHERE i.channel = 'whatsapp' AND i.subject_digest = ? LIMIT 1
    `).bind(subjectDigest).first<{ id: string; preferred_language: LanguageCode | null }>();
    if (existing) {
      await this.db.prepare(`UPDATE profile_identities SET last_seen_at = ? WHERE channel = 'whatsapp' AND subject_digest = ?`)
        .bind(now, subjectDigest).run();
      return { profileId: existing.id, language: existing.preferred_language ?? DEFAULT_LANGUAGE };
    }
    const profileId = crypto.randomUUID();
    await this.db.prepare(`INSERT OR IGNORE INTO profiles (id, preferred_language, created_at, updated_at) VALUES (?, ?, ?, ?)`)
      .bind(profileId, DEFAULT_LANGUAGE, now, now).run();
    await this.db.prepare(`INSERT OR IGNORE INTO profile_identities (id, profile_id, channel, subject_digest, created_at, last_seen_at) VALUES (?, ?, 'whatsapp', ?, ?, ?)`)
      .bind(crypto.randomUUID(), profileId, subjectDigest, now, now).run();
    const winner = await this.db.prepare(`
      SELECT p.id, p.preferred_language FROM profile_identities i JOIN profiles p ON p.id = i.profile_id
      WHERE i.channel = 'whatsapp' AND i.subject_digest = ? LIMIT 1
    `).bind(subjectDigest).first<{ id: string; preferred_language: LanguageCode | null }>();
    if (!winner) throw new Error("whatsapp_profile_persistence_failed");
    return { profileId: winner.id, language: winner.preferred_language ?? DEFAULT_LANGUAGE };
  }

  async findJob(messageId: string): Promise<{ id: string; status: string } | null> {
    return this.db.prepare(`SELECT id, status FROM whatsapp_jobs WHERE inbound_message_id = ? LIMIT 1`)
      .bind(messageId).first<{ id: string; status: string }>();
  }

  async setProfileLanguage(profileId: string, language: LanguageCode, now: string): Promise<void> {
    await this.db.prepare(`UPDATE profiles SET preferred_language = ?, updated_at = ? WHERE id = ?`)
      .bind(language, now, profileId).run();
  }

  async insertImageJob(input: {
    id: string; messageId: string; payloadDigest: string; profileId: string;
    recipientCiphertext: Uint8Array; recipientNonce: Uint8Array;
    mediaCiphertext: Uint8Array; mediaNonce: Uint8Array;
    language: LanguageCode; expiresAt: string; now: string;
  }): Promise<void> {
    await this.db.prepare(`
      INSERT OR IGNORE INTO whatsapp_jobs (
        id, inbound_message_id, payload_digest, profile_id,
        recipient_ciphertext, recipient_nonce, media_id_ciphertext, media_id_nonce,
        language, status, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)
    `).bind(
      input.id, input.messageId, input.payloadDigest, input.profileId,
      input.recipientCiphertext, input.recipientNonce, input.mediaCiphertext, input.mediaNonce,
      input.language, input.expiresAt, input.now,
    ).run();
  }

  async markQueued(id: string): Promise<void> {
    await this.db.prepare(`UPDATE whatsapp_jobs SET status = 'queued' WHERE id = ? AND status = 'received'`)
      .bind(id).run();
  }
}
