import type { LanguageCode } from "../domain/language.ts";
import type { D1DatabaseLike } from "../data/d1.ts";
import { changedExactlyOne } from "../data/d1.ts";

export class ScanRequestRepository {
  private readonly db: D1DatabaseLike;

  constructor(db: D1DatabaseLike) {
    this.db = db;
  }

  async insertWeb(input: {
    id: string;
    analysisId: string;
    idempotencyKey: string;
    accessTokenDigest: string;
    language: LanguageCode;
    createdAt: string;
  }): Promise<boolean> {
    const result = await this.db.prepare(`
      INSERT OR IGNORE INTO scan_requests (
        id, profile_id, analysis_id, channel, idempotency_key, access_token_digest, language, created_at
      ) VALUES (?, NULL, ?, 'web', ?, ?, ?, ?)
    `).bind(
      input.id,
      input.analysisId,
      input.idempotencyKey,
      input.accessTokenDigest,
      input.language,
      input.createdAt,
    ).run();
    return changedExactlyOne(result);
  }
}
