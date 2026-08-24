import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextRequest } from "next/server";
import {
  OFFICER_COOKIE,
  redactAggregateRows,
  redactOfficerAnalysisCostRows,
  redactOfficerCostSummary,
  verifyOfficerSession,
} from "@/public-services";

interface Statement {
  all<T>(): Promise<{ results?: T[] }>;
  first<T>(): Promise<T | null>;
}
interface Db { prepare(query: string): Statement; }
interface Env { DB?: Db; OFFICER_SESSION_SECRET?: string; }

export async function GET(request: NextRequest): Promise<Response> {
  let env: Env;
  try {
    env = (await getCloudflareContext({ async: true })).env as Env;
  } catch {
    return Response.json({ error: "Unavailable." }, { status: 503 });
  }
  if (
    !env.DB || !env.OFFICER_SESSION_SECRET ||
    !await verifyOfficerSession(request.cookies.get(OFFICER_COOKIE)?.value, env.OFFICER_SESSION_SECRET)
  ) return Response.json({ error: "Not found." }, { status: 404 });

  const [aggregateResult, summaryResult, recentResult] = await Promise.all([
    env.DB.prepare(`
      SELECT status, language, COUNT(*) AS count
      FROM analyses GROUP BY status, language ORDER BY status, language
    `).all<Record<string, unknown>>(),
    env.DB.prepare(`
      SELECT
        COUNT(*) AS completed_analyses,
        SUM(CASE WHEN estimated_cost_usd_micros IS NOT NULL THEN 1 ELSE 0 END) AS costed_analyses,
        COALESCE(SUM(estimated_cost_usd_micros), 0) AS total_cost_usd_micros,
        COALESCE(SUM(CASE WHEN estimated_cost_usd_micros IS NOT NULL
          THEN json_extract(token_usage_json, '$.input_tokens') ELSE 0 END), 0) AS input_tokens,
        COALESCE(SUM(CASE WHEN estimated_cost_usd_micros IS NOT NULL
          THEN json_extract(token_usage_json, '$.output_tokens') ELSE 0 END), 0) AS output_tokens,
        COALESCE(SUM(CASE WHEN estimated_cost_usd_micros IS NOT NULL
          THEN web_search_call_count ELSE 0 END), 0) AS web_search_calls
      FROM analyses WHERE status = 'complete'
    `).first<Record<string, unknown>>(),
    env.DB.prepare(`
      SELECT completed_at, status, language, COALESCE(provider_model_id, model_id) AS model_id,
        service_tier,
        json_extract(token_usage_json, '$.input_tokens') AS input_tokens,
        json_extract(token_usage_json, '$.input_tokens_details.cached_tokens') AS cached_input_tokens,
        json_extract(token_usage_json, '$.input_tokens_details.cache_write_tokens') AS cache_write_tokens,
        json_extract(token_usage_json, '$.output_tokens') AS output_tokens,
        json_extract(token_usage_json, '$.output_tokens_details.reasoning_tokens') AS reasoning_tokens,
        json_extract(token_usage_json, '$.total_tokens') AS total_tokens,
        web_search_call_count AS web_search_calls,
        json_extract(timings_json, '$.providerDurationMs') AS provider_duration_ms,
        estimated_cost_usd_micros, cost_basis_version
      FROM analyses ORDER BY created_at DESC LIMIT 50
    `).all<Record<string, unknown>>(),
  ]);

  return Response.json({
    rows: redactAggregateRows(aggregateResult.results ?? []),
    costSummary: redactOfficerCostSummary(summaryResult),
    recentAnalyses: redactOfficerAnalysisCostRows(recentResult.results ?? []),
    redacted: true,
    notice: "Operational cost telemetry only. No images, identifiers, product details, model output, or profile data.",
  }, { headers: { "Cache-Control": "no-store" } });
}
