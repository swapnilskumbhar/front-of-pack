import type {
  AnalysisRecord,
  AnalysisResult,
} from "../domain/analysis.ts";
import type { LanguageCode } from "../domain/language.ts";
import {
  changedExactlyOne,
  type D1DatabaseLike,
} from "./d1.ts";
import {
  assertAnalysisPayloadSize,
  serializeJson,
  type SerializedAnalysisColumns,
} from "./serialization.ts";

type AnalysisRow = {
  id: string;
  cache_key: string;
  image_hash: string;
  media_object_key: string | null;
  language: LanguageCode;
  status: AnalysisRecord["status"];
  attempt_number: number;
  queue_enqueued_at: string | null;
  provider_started_at: string | null;
  openai_response_id: string | null;
  result_json: string | null;
  web_search_used: number;
  expires_at: string | null;
  error_code: string | null;
  created_at: string;
  completed_at: string | null;
};

export interface QueuedAnalysisInput {
  id: string;
  cacheKey: string;
  imageHash: string;
  mediaObjectKey: string | null;
  language: LanguageCode;
  queueEnqueuedAt: string;
  modelId: string;
  promptVersion: string;
  schemaVersion: string;
  rulesVersion: string;
  servicesVersion: string;
  createdAt: string;
  expiresAt?: string | null;
}

export interface CompleteAnalysisInput {
  result: AnalysisResult;
  providerSources?: unknown[];
  localMatches?: unknown[];
  validationReport?: unknown;
  timings?: unknown;
  tokenUsage?: unknown;
  openAiResponseId: string;
  webSearchUsed: boolean;
  estimatedCostUsdMicros?: number | null;
  completedAt: string;
  expiresAt?: string | null;
}

export interface FailedAnalysisInput {
  errorCode: string;
  error?: unknown;
  completedAt: string;
}

export class AnalysisRepository {
  private readonly db: D1DatabaseLike;

  constructor(db: D1DatabaseLike) {
    this.db = db;
  }

  async insertQueued(input: QueuedAnalysisInput): Promise<boolean> {
    const result = await this.db.prepare(`
      INSERT OR IGNORE INTO analyses (
        id, cache_key, image_hash, media_object_key, language, status,
        attempt_number, queue_enqueued_at, model_id, prompt_version,
        schema_version, rules_version, services_version, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, 'queued', 1, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      input.id, input.cacheKey, input.imageHash, input.mediaObjectKey,
      input.language, input.queueEnqueuedAt, input.modelId, input.promptVersion,
      input.schemaVersion, input.rulesVersion, input.servicesVersion,
      input.createdAt, input.expiresAt ?? null,
    ).run();
    return changedExactlyOne(result);
  }

  /** Only the exact queued attempt may authorize the single provider call. */
  async claimProvider(
    id: string,
    attemptNumber: number,
    providerStartedAt: string,
  ): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE analyses
      SET status = 'processing', provider_started_at = ?
      WHERE id = ? AND attempt_number = ? AND status = 'queued'
        AND provider_started_at IS NULL
    `).bind(providerStartedAt, id, attemptNumber).run();
    return changedExactlyOne(result);
  }

  async markComplete(
    id: string,
    attemptNumber: number,
    input: CompleteAnalysisInput,
  ): Promise<boolean> {
    const columns: SerializedAnalysisColumns = {
      resultJson: serializeJson(input.result),
      providerSourcesJson: serializeJson(input.providerSources ?? []),
      localMatchesJson: serializeJson(input.localMatches ?? []),
      validationReportJson: serializeJson(input.validationReport ?? {}),
      timingsJson: serializeJson(input.timings ?? {}),
      tokenUsageJson: serializeJson(input.tokenUsage ?? {}),
    };
    assertAnalysisPayloadSize(columns);

    const result = await this.db.prepare(`
      UPDATE analyses SET
        status = 'complete', result_json = ?, provider_sources_json = ?,
        local_matches_json = ?, validation_report_json = ?, timings_json = ?,
        token_usage_json = ?, openai_response_id = ?, web_search_used = ?,
        estimated_cost_usd_micros = ?, expires_at = ?, error_code = NULL,
        error_json = NULL, completed_at = ?
      WHERE id = ? AND attempt_number = ? AND status = 'processing'
        AND provider_started_at IS NOT NULL
    `).bind(
      columns.resultJson, columns.providerSourcesJson, columns.localMatchesJson,
      columns.validationReportJson, columns.timingsJson, columns.tokenUsageJson,
      input.openAiResponseId, input.webSearchUsed ? 1 : 0,
      input.estimatedCostUsdMicros ?? null, input.expiresAt ?? null,
      input.completedAt, id, attemptNumber,
    ).run();
    return changedExactlyOne(result);
  }

  async markFailed(
    id: string,
    attemptNumber: number,
    input: FailedAnalysisInput,
  ): Promise<boolean> {
    const errorJson = serializeJson(input.error ?? {});
    assertAnalysisPayloadSize({ errorJson });
    const result = await this.db.prepare(`
      UPDATE analyses
      SET status = 'failed', error_code = ?, error_json = ?, completed_at = ?
      WHERE id = ? AND attempt_number = ? AND status = 'processing'
        AND provider_started_at IS NOT NULL
    `).bind(
      input.errorCode, errorJson, input.completedAt, id, attemptNumber,
    ).run();
    return changedExactlyOne(result);
  }

  /** Retry is explicit and rejects stale callers by matching the failed attempt. */
  async retry(
    id: string,
    failedAttemptNumber: number,
    queueEnqueuedAt: string,
    mediaObjectKey: string,
  ): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE analyses SET
        status = 'queued', attempt_number = attempt_number + 1,
        queue_enqueued_at = ?, media_object_key = ?, provider_started_at = NULL,
        openai_response_id = NULL, result_json = NULL,
        provider_sources_json = '[]', local_matches_json = '[]',
        validation_report_json = NULL, web_search_used = 0,
        timings_json = '{}', token_usage_json = '{}',
        estimated_cost_usd_micros = NULL, error_code = NULL,
        error_json = NULL, completed_at = NULL
      WHERE id = ? AND attempt_number = ? AND status = 'failed'
    `).bind(queueEnqueuedAt, mediaObjectKey, id, failedAttemptNumber).run();
    return changedExactlyOne(result);
  }

  async findById(id: string): Promise<AnalysisRecord | null> {
    return this.findOne("id", id);
  }

  async findByCacheKey(cacheKey: string): Promise<AnalysisRecord | null> {
    return this.findOne("cache_key", cacheKey);
  }

  private async findOne(
    field: "id" | "cache_key",
    value: string,
  ): Promise<AnalysisRecord | null> {
    const row = await this.db.prepare(`
      SELECT id, cache_key, image_hash, media_object_key, language, status,
        attempt_number, queue_enqueued_at, provider_started_at,
        openai_response_id, result_json, web_search_used, expires_at,
        error_code, created_at, completed_at
      FROM analyses WHERE ${field} = ? LIMIT 1
    `).bind(value).first<AnalysisRow>();
    return row ? mapAnalysisRow(row) : null;
  }
}

function mapAnalysisRow(row: AnalysisRow): AnalysisRecord {
  return {
    id: row.id,
    cacheKey: row.cache_key,
    imageHash: row.image_hash,
    mediaObjectKey: row.media_object_key,
    language: row.language,
    status: row.status,
    attemptNumber: row.attempt_number,
    queueEnqueuedAt: row.queue_enqueued_at,
    providerStartedAt: row.provider_started_at,
    openAiResponseId: row.openai_response_id,
    result: row.result_json
      ? JSON.parse(row.result_json) as AnalysisResult
      : null,
    webSearchUsed: row.web_search_used === 1,
    expiresAt: row.expires_at,
    errorCode: row.error_code,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}
