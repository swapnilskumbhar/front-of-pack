import type { AnalysisResult } from "../../../../src/domain/analysis.ts";
import { TerraError } from "./errors.ts";
import { parseTerraResponse } from "./parser.ts";
import { buildTerraInstructions } from "./prompt.ts";
import { ANALYSIS_RESULT_SCHEMA } from "./schema.ts";
import { TERRA_MODEL, type ResponsesRequest, type TerraEnv, type TerraInput, type TerraProviderResult } from "./types.ts";

const RESPONSES_URL = "https://api.openai.com/v1/responses";

export function buildTerraRequest(env: TerraEnv, input: TerraInput): ResponsesRequest {
  const effort = input.reasoningEffort ?? env.TERRA_REASONING_EFFORT ?? "low";
  const request: ResponsesRequest = {
    model: env.MODEL_ANALYSIS ?? TERRA_MODEL,
    store: false,
    input: [
      {
        role: "system",
        content: [{
          type: "input_text",
          text: buildTerraInstructions(input.language, input.verifiedRuleContext, input.verifiedServiceDirectory),
        }],
      },
      {
        role: "user",
        content: [
          { type: "input_text", text: "Analyze this one original image." },
          { type: "input_image", image_url: input.imageUrl, detail: "original" },
        ],
      },
    ],
    reasoning: { effort },
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "front_of_pack_analysis",
        strict: true,
        schema: ANALYSIS_RESULT_SCHEMA,
      },
    },
    max_output_tokens: 8_000,
    service_tier: "default",
  };
  if (input.enableWebSearch !== false) {
    request.tools = [{ type: "web_search", user_location: { type: "approximate", country: "IN" } }];
    request.tool_choice = input.requireWebSearch ? "required" : "auto";
    request.max_tool_calls = 6;
    request.include = ["web_search_call.action.sources"];
  }
  return request;
}

export async function callTerraOnce(
  env: TerraEnv,
  input: TerraInput,
  fetcher: typeof fetch = fetch,
): Promise<TerraProviderResult<AnalysisResult>> {
  if (!env.OPENAI_API_KEY) {
    throw new TerraError("configuration_error", "OPENAI_API_KEY is not configured");
  }
  let response: Response;
  try {
    response = await fetcher(RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildTerraRequest(env, input)),
    });
  } catch (cause) {
    throw new TerraError("request_failed", "Responses API request failed", { cause });
  }
  if (!response.ok) {
    const responseId = response.headers.get("x-request-id") ?? undefined;
    throw new TerraError("request_failed", `Responses API returned HTTP ${response.status}`, {
      status: response.status,
      responseId,
    });
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new TerraError("invalid_provider_response", "Responses API returned invalid JSON", { cause });
  }
  return parseTerraResponse(payload, input.language);
}
