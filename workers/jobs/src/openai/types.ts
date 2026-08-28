export const TERRA_MODEL = "gpt-5.6-terra" as const;
export const TERRA_PROMPT_VERSION = "terra-analysis.v17" as const;
export { ANALYSIS_SCHEMA_VERSION } from "../../../../src/domain/analysis.ts";

export type LanguageCode =
  | "en" | "hi" | "mr" | "bn" | "ta" | "te"
  | "kn" | "gu" | "ml" | "pa" | "or" | "ur";

export type ReasoningEffort = "none" | "low" | "medium" | "high";

export interface TerraInput {
  imageUrl: string;
  language: LanguageCode;
  verifiedRuleContext: unknown;
  verifiedServiceDirectory: unknown;
  enableWebSearch?: boolean;
  requireWebSearch?: boolean;
  reasoningEffort?: ReasoningEffort;
}

export interface TerraEnv {
  OPENAI_API_KEY?: string;
  MODEL_ANALYSIS?: string;
  TERRA_REASONING_EFFORT?: ReasoningEffort;
}

export interface SearchSourceMetadata {
  id: string | null;
  title: string | null;
  url: string;
}

export interface TerraProviderResult<T> {
  result: T;
  responseId: string;
  usage: unknown | null;
  providerModelId: string | null;
  serviceTier: string | null;
  searchSources: SearchSourceMetadata[];
  webSearchCallCount: number;
  webSearchUsed: boolean;
}

export interface ResponsesRequest {
  model: string;
  store: false;
  input: Array<Record<string, unknown>>;
  reasoning: { effort: ReasoningEffort };
  text: {
    verbosity: "low";
    format: {
      type: "json_schema";
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  max_output_tokens: number;
  service_tier: "default";
  tools?: Array<{
    type: "web_search";
    user_location: { type: "approximate"; country: "IN" };
  }>;
  tool_choice?: "auto" | "required";
  max_tool_calls?: number;
  include?: ["web_search_call.action.sources"];
}
