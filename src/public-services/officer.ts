export const OFFICER_COOKIE = "fop_officer_session";
export const OFFICER_SESSION_SECONDS = 60 * 60 * 4;

const encoder = new TextEncoder();
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

async function signature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

export async function createOfficerSession(username: string, secret: string, now = Date.now()): Promise<string> {
  const payload = base64url(encoder.encode(JSON.stringify({ sub: username, exp: Math.floor(now / 1000) + OFFICER_SESSION_SECONDS })));
  return `${payload}.${await signature(payload, secret)}`;
}

export async function verifyOfficerSession(token: string | undefined, secret: string, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra || !constantTimeEqual(supplied, await signature(payload, secret))) return false;
  try {
    const json = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
    const data = JSON.parse(json) as { exp?: unknown };
    return typeof data.exp === "number" && data.exp > Math.floor(now / 1000);
  } catch { return false; }
}

export function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

export interface AggregateRow { status: string; language: string; count: number; }
export function redactAggregateRows(rows: readonly Record<string, unknown>[]): AggregateRow[] {
  return rows.flatMap((row) => typeof row.status === "string" && typeof row.language === "string" && typeof row.count === "number" ? [{ status: row.status, language: row.language, count: row.count }] : []);
}

export interface OfficerCostSummary {
  completedAnalyses: number;
  costedAnalyses: number;
  totalCostUsdMicros: number | null;
  averageCostUsdMicros: number | null;
  inputTokens: number;
  outputTokens: number;
  webSearchCalls: number;
}

export interface OfficerAnalysisCostRow {
  completedAt: string | null;
  status: string;
  language: string;
  modelId: string;
  serviceTier: string | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  cacheWriteTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
  webSearchCalls: number | null;
  providerDurationMs: number | null;
  estimatedCostUsdMicros: number | null;
  costBasisVersion: string | null;
}

function safeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function redactOfficerCostSummary(row: Record<string, unknown> | null): OfficerCostSummary {
  const completedAnalyses = safeInteger(row?.completed_analyses) ?? 0;
  const costedAnalyses = safeInteger(row?.costed_analyses) ?? 0;
  const recordedTotalCostUsdMicros = safeInteger(row?.total_cost_usd_micros);
  const totalCostUsdMicros = costedAnalyses > 0 ? recordedTotalCostUsdMicros : null;
  return {
    completedAnalyses,
    costedAnalyses,
    totalCostUsdMicros,
    averageCostUsdMicros: costedAnalyses > 0 && totalCostUsdMicros !== null
      ? Math.round(totalCostUsdMicros / costedAnalyses)
      : null,
    inputTokens: safeInteger(row?.input_tokens) ?? 0,
    outputTokens: safeInteger(row?.output_tokens) ?? 0,
    webSearchCalls: safeInteger(row?.web_search_calls) ?? 0,
  };
}

export function redactOfficerAnalysisCostRows(
  rows: readonly Record<string, unknown>[],
): OfficerAnalysisCostRow[] {
  return rows.flatMap((row) => {
    const status = safeString(row.status);
    const language = safeString(row.language);
    const modelId = safeString(row.model_id);
    if (!status || !language || !modelId) return [];
    return [{
      completedAt: safeString(row.completed_at),
      status,
      language,
      modelId,
      serviceTier: safeString(row.service_tier),
      inputTokens: safeInteger(row.input_tokens),
      cachedInputTokens: safeInteger(row.cached_input_tokens),
      cacheWriteTokens: safeInteger(row.cache_write_tokens),
      outputTokens: safeInteger(row.output_tokens),
      reasoningTokens: safeInteger(row.reasoning_tokens),
      totalTokens: safeInteger(row.total_tokens),
      webSearchCalls: safeInteger(row.web_search_calls),
      providerDurationMs: safeInteger(row.provider_duration_ms),
      estimatedCostUsdMicros: safeInteger(row.estimated_cost_usd_micros),
      costBasisVersion: safeString(row.cost_basis_version),
    }];
  });
}
