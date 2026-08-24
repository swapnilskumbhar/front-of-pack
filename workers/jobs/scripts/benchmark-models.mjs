import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ENABLED_RULE_PACK_ID_SET, ENABLED_SERVICE_ID_SET, RULE_PACKS, SERVICE_DIRECTORY } from "../../../src/knowledge/index.ts";
import { detectImageMime, validateImageBytes } from "../../../src/intake/image.ts";
import { validateAnalysisResult } from "../../../src/validation/analysis-result.ts";
import { callTerraOnce } from "../src/openai/client.ts";
import { estimateOpenAiResponseCost } from "../../../src/cost/openai.ts";

const fullOutput = process.argv.includes("--full");
const requireWebSearch = process.argv.includes("--search");
const enableWebSearch = requireWebSearch || process.argv.includes("--search-auto");
const terraOnly = process.argv.includes("--terra-only");
const flags = new Set(["--full", "--search", "--search-auto", "--terra-only"]);
const imagePath = process.argv.slice(2).find((argument) => !flags.has(argument));
if (!imagePath) throw new Error("Usage: npm run benchmark:models -- <absolute-or-relative-image-path>");

const secretFile = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8");
const keyLine = secretFile.split(/\r?\n/u).find((line) => /^\s*OPENAI_API_KEY\s*=/.test(line));
if (!keyLine) throw new Error("OPENAI_API_KEY is missing from workers/jobs/.dev.vars");
const apiKey = keyLine.slice(keyLine.indexOf("=") + 1).trim().replace(/^(?:"|')|(?:"|')$/gu, "");

const bytes = imagePath === "--synthetic"
  ? Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"))
  : Uint8Array.from(readFileSync(resolve(imagePath)));
const mime = validateImageBytes(bytes);
if (detectImageMime(bytes) !== mime) throw new Error("Image MIME detection failed");
const imageUrl = `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
const ruleContext = RULE_PACKS.map((pack) => ({
  id: pack.id, status: pack.status, categories: pack.categories,
  coverageTier: pack.coverageTier, context: pack.machineContext,
  source: pack.source.url, limitations: pack.limitations.slice(0, 2),
}));
const serviceContext = SERVICE_DIRECTORY.map((service) => ({
  id: service.id, categories: service.categories, purposes: service.purposes,
  url: service.url, routingConstraints: service.routingConstraints,
  limitations: service.limitations.slice(0, 1),
}));

for (const model of terraOnly ? ["gpt-5.6-terra"] : ["gpt-5.6-terra", "gpt-5.6-luna"]) {
  const started = performance.now();
  const provider = await callTerraOnce(
    { OPENAI_API_KEY: apiKey, MODEL_ANALYSIS: model, TERRA_REASONING_EFFORT: "low" },
    {
      imageUrl,
      language: "en",
      verifiedRuleContext: ruleContext,
      verifiedServiceDirectory: serviceContext,
      enableWebSearch,
      requireWebSearch,
    },
  );
  const validation = validateAnalysisResult(provider.result, {
    allowedRuleIds: ENABLED_RULE_PACK_ID_SET,
    allowedServiceIds: ENABLED_SERVICE_ID_SET,
  });
  const usage = provider.usage && typeof provider.usage === "object" ? provider.usage : {};
  const inputTokens = Number(usage.input_tokens ?? 0);
  const cachedTokens = Number(usage.input_tokens_details?.cached_tokens ?? 0);
  const outputTokens = Number(usage.output_tokens ?? 0);
  const estimate = provider.providerModelId === null ? null : estimateOpenAiResponseCost({
    modelId: provider.providerModelId,
    serviceTier: provider.serviceTier,
    usage: provider.usage,
    webSearchCalls: provider.webSearchCallCount,
  });
  console.log(JSON.stringify({
    model,
    durationMs: Math.round(performance.now() - started),
    valid: validation.valid,
    validationErrors: validation.errors.length,
    inputTokens,
    cachedTokens,
    outputTokens,
    reasoningTokens: Number(usage.output_tokens_details?.reasoning_tokens ?? 0),
    estimatedApiCostUsd: estimate === null ? null : estimate.totalCostUsdMicros / 1_000_000,
    analyzedCount: provider.result.analyzedCount,
    findingCount: provider.result.items.reduce((total, item) => total + item.findings.length, 0),
    summary: provider.result.wholeImageSummary,
    webSearchUsed: provider.webSearchUsed,
    webSearchCallCount: provider.webSearchCallCount,
    searchSources: provider.searchSources,
    ...(fullOutput ? { result: provider.result } : {}),
  }));
}
