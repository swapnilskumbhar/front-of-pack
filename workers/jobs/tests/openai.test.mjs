import test from "node:test";
import assert from "node:assert/strict";
import { buildTerraRequest } from "../src/openai/client.ts";
import { TerraError } from "../src/openai/errors.ts";
import { parseTerraResponse } from "../src/openai/parser.ts";

const emptyResult = {
  schemaVersion: "analysis-result.v4",
  language: "hi",
  analyzedCount: 0,
  unknownCount: 0,
  flaggedCount: 0,
  truncated: false,
  wholeImageSummary: "कोई पैक स्पष्ट नहीं है।",
  strongestMaterialFinding: null,
  items: [],
  disclaimer: "स्वतंत्र शैक्षिक विश्लेषण।",
};

test("constructs one bounded strict Responses request with optional hosted search", () => {
  const request = buildTerraRequest({}, {
    imageUrl: "data:image/jpeg;base64,AA==",
    language: "hi",
    verifiedRuleContext: [{ id: "food.v1" }],
    verifiedServiceDirectory: [{ id: "nch" }],
  });

  assert.equal(request.model, "gpt-5.6-terra");
  assert.equal(request.store, false);
  assert.equal(request.reasoning.effort, "low");
  assert.equal(request.text.verbosity, "low");
  assert.equal(request.service_tier, "default");
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.strict, true);
  assert.deepEqual(request.tools, [{ type: "web_search", user_location: { type: "approximate", country: "IN" } }]);
  assert.deepEqual(request.include, ["web_search_call.action.sources"]);
  assert.equal(request.max_tool_calls, 6);
  assert.equal(request.max_output_tokens, 8_000);
  assert.equal(request.input.length, 2);
  assert.match(JSON.stringify(request.input), /data:image\/jpeg;base64,AA==/);
  assert.match(JSON.stringify(request.input), /"detail":"original"/);
  const prompt = JSON.stringify(request.input);
  assert.match(prompt, /only independently useful, substantiated findings/);
  assert.match(prompt, /Fewer is better; never pad to a count/);
  assert.doesNotMatch(prompt, /normally return 4-8 findings|at most three findings|For rating|Rating anchors/);
  assert.match(JSON.stringify(request.input), /CAFFEINE WARNING/);
  assert.match(JSON.stringify(request.input), /CLAIMS CONTRACT/);
  assert.match(JSON.stringify(request.input), /SEARCH COMPLETION CONTRACT/);
  assert.match(JSON.stringify(request.input), /identity-only result is not research completion/i);
  assert.match(JSON.stringify(request.text.format.schema), /contradicted/);
  const productSchema = request.text.format.schema.properties.items.items;
  assert.equal(productSchema.required.includes("rating"), false);
  assert.equal("rating" in productSchema.properties, false);
  assert.ok(productSchema.required.includes("webResearchOutcome"));
  assert.ok(productSchema.required.includes("webMatchEvidenceIds"));
  assert.equal(productSchema.properties.citations.items.properties.providerSourceId.maxLength, 2048);
  const findingSchema = productSchema.properties.findings.items;
  assert.ok(findingSchema.required.includes("topic"));
  assert.ok(findingSchema.properties.topic.enum.includes("total_sugars"));
  assert.ok(findingSchema.properties.topic.enum.includes("preservatives"));
});

test("can require India-scoped hosted search with bounded product follow-ups", () => {
  const request = buildTerraRequest({}, {
    imageUrl: "data:image/jpeg;base64,AA==", language: "en",
    verifiedRuleContext: [], verifiedServiceDirectory: [], requireWebSearch: true,
  });
  assert.equal(request.tool_choice, "required");
  assert.equal(request.max_tool_calls, 6);
  assert.equal(request.tools[0].user_location.country, "IN");
});

test("can disable search without adding a second request path", () => {
  const request = buildTerraRequest({ TERRA_REASONING_EFFORT: "low" }, {
    imageUrl: "https://example.test/image.jpg",
    language: "en",
    verifiedRuleContext: [],
    verifiedServiceDirectory: [],
    enableWebSearch: false,
  });
  assert.equal(request.reasoning.effort, "low");
  assert.equal(request.tools, undefined);
  assert.equal(request.include, undefined);
});

test("supports Luna through the same one-call request contract", () => {
  const request = buildTerraRequest({ MODEL_ANALYSIS: "gpt-5.6-luna" }, {
    imageUrl: "data:image/png;base64,AA==",
    language: "en",
    verifiedRuleContext: [],
    verifiedServiceDirectory: [],
    enableWebSearch: false,
  });
  assert.equal(request.model, "gpt-5.6-luna");
  assert.equal(request.input.length, 2);
  assert.equal(request.text.format.type, "json_schema");
});

test("parses output_text and exposes usage and returned web-search sources", () => {
  const parsed = parseTerraResponse({
    id: "resp_123",
    model: "gpt-5.6-terra",
    service_tier: "default",
    output_text: JSON.stringify(emptyResult),
    usage: { input_tokens: 10, output_tokens: 20 },
    output: [
      {
        type: "web_search_call",
        action: { sources: [{ id: "src_1", title: "Example", url: "https://example.test/a" }] },
      },
      { type: "web_search_call", action: { sources: [] } },
    ],
  }, "hi");

  assert.equal(parsed.responseId, "resp_123");
  assert.equal(parsed.result.language, "hi");
  assert.equal(parsed.providerModelId, "gpt-5.6-terra");
  assert.equal(parsed.serviceTier, "default");
  assert.equal(parsed.webSearchCallCount, 2);
  assert.equal(parsed.webSearchUsed, true);
  assert.deepEqual(parsed.searchSources, [{ id: "src_1", title: "Example", url: "https://example.test/a" }]);
});

test("parses message output and rejects a mismatched requested language", () => {
  assert.throws(() => parseTerraResponse({
    id: "resp_456",
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(emptyResult) }] }],
  }, "en"), (error) => error instanceof TerraError && error.code === "invalid_structured_output");
});

test("surfaces incomplete responses as typed non-retry errors", () => {
  assert.throws(() => parseTerraResponse({
    id: "resp_incomplete",
    status: "incomplete",
    output: [],
  }, "hi"), (error) =>
    error instanceof TerraError &&
    error.code === "invalid_provider_response" &&
    error.responseId === "resp_incomplete");
});
