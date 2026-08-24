import test from "node:test";
import assert from "node:assert/strict";
import { buildTerraRequest } from "../src/openai/client.ts";
import { TerraError } from "../src/openai/errors.ts";
import { parseTerraResponse } from "../src/openai/parser.ts";

const emptyResult = {
  schemaVersion: "analysis-result.v2",
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
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.strict, true);
  assert.deepEqual(request.tools, [{ type: "web_search" }]);
  assert.deepEqual(request.include, ["web_search_call.action.sources"]);
  assert.equal(request.max_tool_calls, 3);
  assert.equal(request.max_output_tokens, 6_000);
  assert.equal(request.input.length, 2);
  assert.match(JSON.stringify(request.input), /data:image\/jpeg;base64,AA==/);
  assert.match(JSON.stringify(request.input), /"detail":"original"/);
  assert.match(JSON.stringify(request.input), /every independently useful, substantiated warning/);
  assert.match(JSON.stringify(request.input), /normally return 4-8 findings/);
  assert.match(JSON.stringify(request.input), /experimental 0-10 label-based shopper rating/);
  assert.match(JSON.stringify(request.input), /CAFFEINE WARNING/);
});

test("can require hosted search while allowing one targeted follow-up", () => {
  const request = buildTerraRequest({}, {
    imageUrl: "data:image/jpeg;base64,AA==", language: "en",
    verifiedRuleContext: [], verifiedServiceDirectory: [], requireWebSearch: true,
  });
  assert.equal(request.tool_choice, "required");
  assert.equal(request.max_tool_calls, 3);
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
    output_text: JSON.stringify(emptyResult),
    usage: { input_tokens: 10, output_tokens: 20 },
    output: [{
      type: "web_search_call",
      action: { sources: [{ id: "src_1", title: "Example", url: "https://example.test/a" }] },
    }],
  }, "hi");

  assert.equal(parsed.responseId, "resp_123");
  assert.equal(parsed.result.language, "hi");
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
