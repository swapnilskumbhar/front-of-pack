import assert from "node:assert/strict";
import test from "node:test";

import { validateAnalysisResult } from "../src/validation/analysis-result.ts";

const options = {
  allowedRuleIds: new Set(["rule.food"]),
  allowedServiceIds: new Set(["service.fssai"]),
};

function validResult() {
  return {
    schemaVersion: "analysis-result.v1",
    language: "en",
    analyzedCount: 1,
    unknownCount: 0,
    flaggedCount: 1,
    truncated: false,
    wholeImageSummary: "One packaged product was analyzed.",
    strongestMaterialFinding: "Review the printed sodium value.",
    disclaimer: "This is label information, not medical advice.",
    items: [{
      position: 1,
      identity: { nameAsPrinted: "Food", brandAsPrinted: null, variantAsPrinted: null, gtin: null, confidence: "high" },
      category: "food",
      coverage: { tier: "category_rules", rulePackIds: ["rule.food"], limitations: [] },
      summary: "The package declares its ingredients.",
      findings: [{ id: "finding-1", kind: "regulatory_context", level: "attention", title: "Declaration review", explanation: "A declaration needs attention.", evidenceIds: ["evidence-1"], ruleIds: ["rule.food"], experimental: false }],
      claimAudits: [{ claimAsPrinted: "Natural", assessment: "Not established from this label alone.", evidenceIds: ["evidence-1"], status: "not_established" }],
      evidence: [{ id: "evidence-1", origin: "verified_rule", excerptOrObservation: "A declaration is visible.", citationId: "citation-1" }],
      citations: [{ id: "citation-1", title: "FSSAI", url: "https://www.fssai.gov.in/" }],
      serviceRoute: { serviceId: "service.fssai", reason: "Use the official consumer channel if needed." },
      needsClearerImage: false,
      retakeGuidance: null,
    }],
  };
}

test("accepts a valid analysis", () => {
  const report = validateAnalysisResult(validResult(), options);
  assert.equal(report.valid, true, JSON.stringify(report.errors));
  assert.ok(report.serializedBytes && report.serializedBytes > 0);
});

test("accepts an empty result when no product is identifiable", () => {
  const result = validResult();
  result.items = [];
  result.analyzedCount = 0;
  result.unknownCount = 0;
  result.flaggedCount = 0;
  assert.equal(validateAnalysisResult(result, options).valid, true);
});

test("rejects an unsupported schema version", () => {
  const result = validResult();
  result.schemaVersion = "analysis-result.v0";
  assert.ok(validateAnalysisResult(result, options).errors.some(({ code }) => code === "unsupported_schema_version"));
});

test("reports cross-product evidence references and duplicate positions", () => {
  const result = validResult();
  const second = structuredClone(result.items[0]);
  second.findings[0].evidenceIds = ["evidence-from-first"];
  second.position = 1;
  second.evidence[0].id = "other-evidence";
  result.items.push(second);
  result.analyzedCount = 2;
  const codes = validateAnalysisResult(result, options).errors.map(({ code }) => code);
  assert.ok(codes.includes("duplicate_position"));
  assert.ok(codes.includes("unresolved_evidence"));
});

test("accepts Terra semantic counters without re-deriving them from item count", () => {
  const result = validResult();
  result.unknownCount = 1;
  result.flaggedCount = 2;
  assert.equal(validateAnalysisResult(result, options).valid, true);
});

test("accepts allow-listed rule evidence without inventing a provider citation", () => {
  const result = validResult();
  result.items[0].evidence[0].citationId = null;
  result.items[0].citations = [];
  assert.equal(validateAnalysisResult(result, options).valid, true);
});

test("rejects unsupported ids, URL schemes, and forbidden verdicts", () => {
  const result = validResult();
  result.language = "xx";
  result.items[0].coverage.rulePackIds = ["unknown-rule"];
  result.items[0].serviceRoute = { serviceId: "unknown-service", reason: "This product is unsafe." };
  result.items[0].citations[0].url = "javascript:alert(1)";
  const codes = validateAnalysisResult(result, options).errors.map(({ code }) => code);
  assert.ok(codes.includes("unsupported_language"));
  assert.ok(codes.includes("disallowed_rule_id"));
  assert.ok(codes.includes("disallowed_service_id"));
  assert.ok(codes.includes("invalid_url"));
  assert.ok(codes.includes("forbidden_wording"));
});

test("enforces experimental FOP and hosted-search citation semantics", () => {
  const result = validResult();
  result.items[0].findings[0].experimental = true;
  result.items[0].evidence[0] = { id: "evidence-1", origin: "hosted_web_search", excerptOrObservation: "Search result", citationId: "citation-1" };
  const codes = validateAnalysisResult(result, options).errors.map(({ code }) => code);
  assert.ok(codes.includes("invalid_experimental_semantics"));
  assert.ok(codes.includes("invalid_evidence_relationship"));
});

test("enforces the configured serialized size ceiling", () => {
  const result = validResult();
  result.wholeImageSummary = "x".repeat(2_000);
  const report = validateAnalysisResult(result, { ...options, maxSerializedBytes: 1_000 });
  assert.ok(report.errors.some(({ code }) => code === "serialized_size_exceeded"));
});
