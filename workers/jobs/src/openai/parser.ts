import type { AnalysisResult } from "../../../../src/domain/analysis.ts";
import { TerraError } from "./errors.ts";
import { ANALYSIS_SCHEMA_VERSION, type LanguageCode, type SearchSourceMetadata, type TerraProviderResult } from "./types.ts";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? value as UnknownRecord : null;
}

function outputText(response: UnknownRecord): string | null {
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.output)) return null;
  for (const item of response.output) {
    const output = record(item);
    if (output?.type !== "message" || !Array.isArray(output.content)) continue;
    for (const part of output.content) {
      const content = record(part);
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return null;
}

export function extractSearchSources(response: UnknownRecord): SearchSourceMetadata[] {
  if (!Array.isArray(response.output)) return [];
  const unique = new Map<string, SearchSourceMetadata>();
  for (const item of response.output) {
    const call = record(item);
    if (call?.type !== "web_search_call") continue;
    const action = record(call.action);
    if (!Array.isArray(action?.sources)) continue;
    for (const value of action.sources) {
      const source = record(value);
      if (!source || typeof source.url !== "string") continue;
      unique.set(source.url, {
        id: typeof source.id === "string" ? source.id : null,
        title: typeof source.title === "string" ? source.title : null,
        url: source.url,
      });
    }
  }
  return [...unique.values()];
}

export function countWebSearchCalls(response: UnknownRecord): number {
  return Array.isArray(response.output)
    ? response.output.filter((item) => record(item)?.type === "web_search_call").length
    : 0;
}

function validateResult(value: unknown, language: LanguageCode): asserts value is AnalysisResult {
  const result = record(value);
  if (
    result?.schemaVersion !== ANALYSIS_SCHEMA_VERSION ||
    result.language !== language ||
    !Array.isArray(result.items) ||
    result.items.length > 6 ||
    typeof result.analyzedCount !== "number" ||
    result.analyzedCount !== result.items.length
  ) {
    throw new TerraError("invalid_structured_output", "Terra structured output failed invariant validation");
  }
}

export function parseTerraResponse(responseValue: unknown, language: LanguageCode): TerraProviderResult<AnalysisResult> {
  const response = record(responseValue);
  if (!response || typeof response.id !== "string") {
    throw new TerraError("invalid_provider_response", "Responses API returned no response id");
  }
  if (response.status === "incomplete" || response.status === "failed") {
    throw new TerraError("invalid_provider_response", `Responses API returned terminal status ${response.status}`, {
      responseId: response.id,
    });
  }
  if (Array.isArray(response.output) && response.output.some((item) => {
    const output = record(item);
    return output?.type === "message" && Array.isArray(output.content) &&
      output.content.some((part) => record(part)?.type === "refusal");
  })) {
    throw new TerraError("invalid_provider_response", "Terra refused the analysis request", { responseId: response.id });
  }
  const text = outputText(response);
  if (text === null) {
    throw new TerraError("invalid_provider_response", "Responses API returned no output_text", { responseId: response.id });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new TerraError("invalid_structured_output", "Terra output was not valid JSON", { cause, responseId: response.id });
  }
  validateResult(parsed, language);
  const searchSources = extractSearchSources(response);
  const webSearchCallCount = countWebSearchCalls(response);
  return {
    result: parsed,
    responseId: response.id,
    usage: response.usage ?? null,
    providerModelId: typeof response.model === "string" ? response.model : null,
    serviceTier: typeof response.service_tier === "string" ? response.service_tier : null,
    searchSources,
    webSearchCallCount,
    webSearchUsed: webSearchCallCount > 0,
  };
}
