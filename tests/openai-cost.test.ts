import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateOpenAiResponseCost,
  normalizeResponsesUsage,
  OPENAI_COST_BASIS_VERSION,
} from "../src/cost/openai.ts";

test("estimates Terra tokens, cache writes, and exact web-search calls without double-counting reasoning", () => {
  const estimate = estimateOpenAiResponseCost({
    modelId: "gpt-5.6-terra",
    serviceTier: "default",
    usage: {
      input_tokens: 10_000,
      input_tokens_details: { cached_tokens: 2_000, cache_write_tokens: 1_000 },
      output_tokens: 500,
      output_tokens_details: { reasoning_tokens: 300 },
      total_tokens: 10_500,
    },
    webSearchCalls: 2,
  });

  assert.ok(estimate);
  assert.equal(estimate.basisVersion, OPENAI_COST_BASIS_VERSION);
  assert.equal(estimate.uncachedInputTokens, 7_000);
  assert.equal(estimate.totalCostUsdMicros, 42_900);
  assert.equal(estimate.reasoningTokens, 300);
});

test("uses long-context pricing only above 272,000 input tokens", () => {
  const atBoundary = estimateOpenAiResponseCost({
    modelId: "gpt-5.6-terra", serviceTier: "default",
    usage: { input_tokens: 272_000, output_tokens: 1 }, webSearchCalls: 0,
  });
  const aboveBoundary = estimateOpenAiResponseCost({
    modelId: "gpt-5.6-terra", serviceTier: "default",
    usage: { input_tokens: 272_001, output_tokens: 1 }, webSearchCalls: 0,
  });
  assert.equal(atBoundary?.longContext, false);
  assert.equal(atBoundary?.totalCostUsdMicros, 544_012);
  assert.equal(aboveBoundary?.longContext, true);
  assert.equal(aboveBoundary?.totalCostUsdMicros, 1_088_022);
});

test("treats absent cache details as uncached input but rejects malformed accounting", () => {
  assert.deepEqual(normalizeResponsesUsage({ input_tokens: 10, output_tokens: 2 }), {
    input_tokens: 10,
    input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
    output_tokens: 2,
    output_tokens_details: { reasoning_tokens: 0 },
    total_tokens: 12,
  });
  for (const usage of [
    null,
    {},
    { input_tokens: -1, output_tokens: 1 },
    { input_tokens: 1.5, output_tokens: 1 },
    { input_tokens: "1", output_tokens: 1 },
    { input_tokens: 2, input_tokens_details: { cached_tokens: 3 }, output_tokens: 1 },
    { input_tokens: 2, output_tokens: 1, output_tokens_details: { reasoning_tokens: 2 } },
  ]) {
    assert.equal(estimateOpenAiResponseCost({
      modelId: "gpt-5.6-terra", serviceTier: "default", usage, webSearchCalls: 0,
    }), null);
  }
  assert.equal(estimateOpenAiResponseCost({
    modelId: "gpt-5.6-terra", serviceTier: "priority",
    usage: { input_tokens: 2, output_tokens: 1 }, webSearchCalls: 0,
  }), null);
  assert.equal(estimateOpenAiResponseCost({
    modelId: "gpt-5.6-terra", serviceTier: "default",
    usage: { input_tokens: 1, input_tokens_details: { cache_write_tokens: 1 }, output_tokens: 0 },
    webSearchCalls: 0,
  })?.totalCostUsdMicros, 3);
});
