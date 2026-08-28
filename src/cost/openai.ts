export const OPENAI_COST_BASIS_VERSION = "openai-standard-2026-08-24" as const;
export const OPENAI_WEB_SEARCH_USD_MICROS_PER_CALL = 10_000 as const;
export const OPENAI_LONG_CONTEXT_INPUT_THRESHOLD = 272_000 as const;

export interface ResponsesUsage {
  input_tokens: number;
  input_tokens_details?: {
    cached_tokens?: number;
    cache_write_tokens?: number;
  };
  output_tokens: number;
  output_tokens_details?: {
    reasoning_tokens?: number;
  };
  total_tokens?: number;
}

export interface OpenAiCostEstimate {
  basisVersion: typeof OPENAI_COST_BASIS_VERSION;
  modelId: "gpt-5.6-sol" | "gpt-5.6-terra" | "gpt-5.6-luna";
  serviceTier: "default";
  longContext: boolean;
  inputTokens: number;
  uncachedInputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  webSearchCalls: number;
  inputCostUsdMicros: number;
  cachedInputCostUsdMicros: number;
  cacheWriteCostUsdMicros: number;
  outputCostUsdMicros: number;
  webSearchCostUsdMicros: number;
  totalCostUsdMicros: number;
}

type SupportedModel = OpenAiCostEstimate["modelId"];
type TokenRates = Readonly<{
  input: number;
  cachedInput: number;
  cacheWrite: number;
  output: number;
}>;

const STANDARD_SHORT_CONTEXT_RATES: Readonly<Record<SupportedModel, TokenRates>> = {
  "gpt-5.6-sol": { input: 4, cachedInput: 0.4, cacheWrite: 5, output: 20 },
  "gpt-5.6-terra": { input: 2, cachedInput: 0.2, cacheWrite: 2.5, output: 12 },
  "gpt-5.6-luna": { input: 0.2, cachedInput: 0.02, cacheWrite: 0.25, output: 1.2 },
};

const STANDARD_LONG_CONTEXT_RATES: Readonly<Record<SupportedModel, TokenRates>> = {
  "gpt-5.6-sol": { input: 8, cachedInput: 0.8, cacheWrite: 10, output: 30 },
  "gpt-5.6-terra": { input: 4, cachedInput: 0.4, cacheWrite: 5, output: 18 },
  "gpt-5.6-luna": { input: 0.4, cachedInput: 0.04, cacheWrite: 0.5, output: 1.8 },
};

function nonNegativeSafeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function supportedModel(value: string): SupportedModel | null {
  if (value === "gpt-5.6-sol" || value.startsWith("gpt-5.6-sol-")) return "gpt-5.6-sol";
  if (value === "gpt-5.6-terra" || value.startsWith("gpt-5.6-terra-")) return "gpt-5.6-terra";
  if (value === "gpt-5.6-luna" || value.startsWith("gpt-5.6-luna-")) return "gpt-5.6-luna";
  return null;
}

export function normalizeResponsesUsage(value: unknown): ResponsesUsage | null {
  const usage = record(value);
  if (!usage) return null;
  const inputTokens = nonNegativeSafeInteger(usage.input_tokens);
  const outputTokens = nonNegativeSafeInteger(usage.output_tokens);
  if (inputTokens === null || outputTokens === null) return null;

  const inputDetails = record(usage.input_tokens_details);
  const outputDetails = record(usage.output_tokens_details);
  const cachedInputTokens = inputDetails?.cached_tokens === undefined
    ? 0 : nonNegativeSafeInteger(inputDetails.cached_tokens);
  const cacheWriteTokens = inputDetails?.cache_write_tokens === undefined
    ? 0 : nonNegativeSafeInteger(inputDetails.cache_write_tokens);
  const reasoningTokens = outputDetails?.reasoning_tokens === undefined
    ? 0 : nonNegativeSafeInteger(outputDetails.reasoning_tokens);
  if (
    cachedInputTokens === null || cacheWriteTokens === null || reasoningTokens === null ||
    cachedInputTokens + cacheWriteTokens > inputTokens || reasoningTokens > outputTokens
  ) return null;

  const suppliedTotal = usage.total_tokens === undefined
    ? inputTokens + outputTokens
    : nonNegativeSafeInteger(usage.total_tokens);
  if (suppliedTotal === null || suppliedTotal < inputTokens + outputTokens) return null;

  return {
    input_tokens: inputTokens,
    input_tokens_details: {
      cached_tokens: cachedInputTokens,
      cache_write_tokens: cacheWriteTokens,
    },
    output_tokens: outputTokens,
    output_tokens_details: { reasoning_tokens: reasoningTokens },
    total_tokens: suppliedTotal,
  };
}

export function estimateOpenAiResponseCost(input: {
  modelId: string;
  serviceTier: string | null;
  usage: unknown;
  webSearchCalls: number;
}): OpenAiCostEstimate | null {
  const modelId = supportedModel(input.modelId);
  const usage = normalizeResponsesUsage(input.usage);
  const webSearchCalls = nonNegativeSafeInteger(input.webSearchCalls);
  if (!modelId || input.serviceTier !== "default" || !usage || webSearchCalls === null) return null;

  const inputTokens = usage.input_tokens;
  const cachedInputTokens = usage.input_tokens_details?.cached_tokens ?? 0;
  const cacheWriteTokens = usage.input_tokens_details?.cache_write_tokens ?? 0;
  const uncachedInputTokens = inputTokens - cachedInputTokens - cacheWriteTokens;
  const outputTokens = usage.output_tokens;
  const reasoningTokens = usage.output_tokens_details?.reasoning_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? inputTokens + outputTokens;
  const longContext = inputTokens > OPENAI_LONG_CONTEXT_INPUT_THRESHOLD;
  const rates = longContext
    ? STANDARD_LONG_CONTEXT_RATES[modelId]
    : STANDARD_SHORT_CONTEXT_RATES[modelId];

  const rawInputCostUsdMicros = uncachedInputTokens * rates.input;
  const rawCachedInputCostUsdMicros = cachedInputTokens * rates.cachedInput;
  const rawCacheWriteCostUsdMicros = cacheWriteTokens * rates.cacheWrite;
  const rawOutputCostUsdMicros = outputTokens * rates.output;
  const inputCostUsdMicros = Math.round(rawInputCostUsdMicros);
  const cachedInputCostUsdMicros = Math.round(rawCachedInputCostUsdMicros);
  const cacheWriteCostUsdMicros = Math.round(rawCacheWriteCostUsdMicros);
  const outputCostUsdMicros = Math.round(rawOutputCostUsdMicros);
  const webSearchCostUsdMicros = webSearchCalls * OPENAI_WEB_SEARCH_USD_MICROS_PER_CALL;
  const totalCostUsdMicros = Math.round(rawInputCostUsdMicros + rawCachedInputCostUsdMicros +
    rawCacheWriteCostUsdMicros + rawOutputCostUsdMicros + webSearchCostUsdMicros);

  return {
    basisVersion: OPENAI_COST_BASIS_VERSION,
    modelId,
    serviceTier: "default",
    longContext,
    inputTokens,
    uncachedInputTokens,
    cachedInputTokens,
    cacheWriteTokens,
    outputTokens,
    reasoningTokens,
    totalTokens,
    webSearchCalls,
    inputCostUsdMicros,
    cachedInputCostUsdMicros,
    cacheWriteCostUsdMicros,
    outputCostUsdMicros,
    webSearchCostUsdMicros,
    totalCostUsdMicros,
  };
}

export function buildPersistedUsage(
  usage: unknown,
  estimate: OpenAiCostEstimate | null,
  webSearchCalls: number,
): Record<string, unknown> {
  const normalized = normalizeResponsesUsage(usage);
  return {
    ...(normalized ?? {}),
    web_search_calls: webSearchCalls,
    cost_estimate: estimate,
  };
}
