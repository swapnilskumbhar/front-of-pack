import type { LanguageCode } from "../domain/language";
import type { Profile } from "../domain/profile";
import { changedExactlyOne, type D1DatabaseLike } from "./d1";

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

export class ProfileRepository {
  constructor(private readonly db: D1DatabaseLike) {}

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
}
