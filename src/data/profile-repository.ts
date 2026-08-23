import type { LanguageCode } from "../domain/language.ts";
import type { Profile } from "../domain/profile.ts";
import { changedExactlyOne, type D1DatabaseLike } from "./d1.ts";

type ProfileRow = {
  id: string;
  preferred_language: LanguageCode | null;
  read_aloud: number;
  compact_results: number;
  consent_version: string | null;
  onboarding_complete: number;
  created_at: string;
  updated_at: string;
};

type ProfileIdentityRow = {
  profile_id: string;
};

export class ProfileRepository {
  private readonly db: D1DatabaseLike;

  constructor(db: D1DatabaseLike) {
    this.db = db;
  }

  async upsertLanguage(
    id: string,
    preferredLanguage: LanguageCode,
    now: string,
  ): Promise<boolean> {
    const result = await this.db.prepare(`
      INSERT INTO profiles (
        id, preferred_language, created_at, updated_at
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        preferred_language = excluded.preferred_language,
        updated_at = excluded.updated_at
    `).bind(id, preferredLanguage, now, now).run();
    return changedExactlyOne(result);
  }

  async findById(id: string): Promise<Profile | null> {
    const row = await this.db.prepare(`
      SELECT id, preferred_language, read_aloud, compact_results,
        consent_version, onboarding_complete, created_at, updated_at
      FROM profiles WHERE id = ? LIMIT 1
    `).bind(id).first<ProfileRow>();

    return row ? {
      id: row.id,
      preferredLanguage: row.preferred_language,
      readAloud: row.read_aloud === 1,
      compactResults: row.compact_results === 1,
      consentVersion: row.consent_version,
      onboardingComplete: row.onboarding_complete === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } : null;
  }
  async findProfileIdByIdentity(channel: "web_device" | "whatsapp", subjectDigest: string): Promise<string | null> {
    const row = await this.db.prepare(`
      SELECT profile_id FROM profile_identities
      WHERE channel = ? AND subject_digest = ? LIMIT 1
    `).bind(channel, subjectDigest).first<ProfileIdentityRow>();
    return row?.profile_id ?? null;
  }

  async insertIdentity(input: {
    id: string;
    profileId: string;
    channel: "web_device" | "whatsapp";
    subjectDigest: string;
    now: string;
  }): Promise<boolean> {
    const result = await this.db.prepare(`
      INSERT OR IGNORE INTO profile_identities (
        id, profile_id, channel, subject_digest, created_at, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(input.id, input.profileId, input.channel, input.subjectDigest, input.now, input.now).run();
    return changedExactlyOne(result);
  }

  async touchIdentity(channel: "web_device" | "whatsapp", subjectDigest: string, now: string): Promise<void> {
    await this.db.prepare(`
      UPDATE profile_identities SET last_seen_at = ?
      WHERE channel = ? AND subject_digest = ?
    `).bind(now, channel, subjectDigest).run();
  }
}
