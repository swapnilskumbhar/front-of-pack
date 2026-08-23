import assert from "node:assert/strict";
import test from "node:test";

import type { ProductAnalysis } from "../src/domain/analysis.ts";
import { buildAttentionIndicator } from "../src/engine/presentation.ts";
import type { WholePackSignal } from "../src/engine/types.ts";

const item = (overrides: Partial<ProductAnalysis> = {}): ProductAnalysis => ({
  position: 1, identity: { nameAsPrinted: "Product", brandAsPrinted: null, variantAsPrinted: null, gtin: null, confidence: "high" },
  category: "food", nutrition: null, ingredientTokens: [], claimsAsPrinted: [], printedVegMark: null,
  coverage: { tier: "category_rules", rulePackIds: [], limitations: [] }, summary: "Product checked.",
  findings: [], claimAudits: [], evidence: [], citations: [], serviceRoute: null,
  needsClearerImage: false, retakeGuidance: null, ...overrides,
});

const sugarSignal: WholePackSignal = {
  kind: "whole_pack_rda", nutrient: "added_sugars", severity: "high", wholePackAmount: 27.5,
  unit: "g", wholePackRdaPercent: 54, printedServingRdaPercent: 54, servingSize: 250,
  netQuantity: 250, quantityUnit: "ml", basis: "pack_printed_rda",
};

test("high deterministic signal produces needs-attention indicator", () => {
  assert.equal(buildAttentionIndicator(item(), [sugarSignal], "en").level, "needs_attention");
});

test("missing panel alone produces not-enough-information, not a warning", () => {
  const result = buildAttentionIndicator(item({ needsClearerImage: true, retakeGuidance: "Show the back panel.", findings: [
    { id: "f", kind: "label_fact", level: "attention", title: "Back panel needed", explanation: "Nutrition is not visible.", evidenceIds: [], ruleIds: [], experimental: false },
  ] }), [], "en");
  assert.equal(result.level, "not_enough_information");
});

test("provisional online evidence produces some-caution indicator", () => {
  const result = buildAttentionIndicator(item({ evidence: [
    { id: "e", origin: "hosted_web_search", excerptOrObservation: "Matching page lists wheat.", citationId: null, visibleOnPackage: false },
  ] }), [], "en");
  assert.equal(result.level, "some_caution");
});

test("completed readable checks with no signal do not claim safety", () => {
  const result = buildAttentionIndicator(item({ ingredientTokens: ["water"] }), [], "en");
  assert.equal(result.level, "no_major_concern");
  assert.equal(result.title, "NO MAJOR CONCERN FOUND");
});
