import assert from "node:assert/strict";
import test from "node:test";

import type { ProductAnalysis } from "../src/domain/analysis.ts";
import { buildAttentionIndicator, buildProductProfile, buildShopperIndicators } from "../src/engine/presentation.ts";
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

test("online identity evidence alone does not create caution", () => {
  const result = buildAttentionIndicator(item({ evidence: [
    { id: "e", origin: "hosted_web_search", excerptOrObservation: "Matching page lists wheat.", citationId: null, visibleOnPackage: false },
  ] }), [], "en");
  assert.equal(result.level, "not_enough_information");
});

test("sufficiently matched web evidence needs a material finding to create caution", () => {
  const result = buildAttentionIndicator(item({
    webMatchConfidence: "high",
    evidence: [{ id: "e", origin: "hosted_web_search", excerptOrObservation: "Official ingredients list wheat.", citationId: null, visibleOnPackage: false }],
    findings: [{ id: "f", kind: "ingredient", level: "attention", title: "Contains wheat", explanation: "Avoid if you have a wheat allergy.", evidenceIds: ["e"], ruleIds: [], experimental: false }],
  }), [], "en");
  assert.equal(result.level, "some_caution");
});

test("low-confidence web evidence cannot create caution", () => {
  const result = buildAttentionIndicator(item({
    webMatchConfidence: "low",
    evidence: [{ id: "e", origin: "hosted_web_search", excerptOrObservation: "Possibly lists wheat.", citationId: null, visibleOnPackage: false }],
    findings: [{ id: "f", kind: "ingredient", level: "attention", title: "Contains wheat", explanation: "Avoid if you have a wheat allergy.", evidenceIds: ["e"], ruleIds: [], experimental: false }],
  }), [], "en");
  assert.equal(result.level, "not_enough_information");
});

test("generic category alone is not a product profile", () => {
  assert.equal(buildProductProfile(item(), []), null);
});

test("shopper indicators preserve named issues instead of umbrella caution", () => {
  const indicators = buildShopperIndicators(item({ findings: [{
    id: "f", kind: "nutrition", level: "attention", title: "High sugar",
    explanation: "27 g per can.", evidenceIds: [], ruleIds: [], experimental: false,
  }] }), [], "en");
  assert.deepEqual(indicators[0], { tone: "red", title: "HIGH SUGAR", detail: "27 g per can.", evidenceIds: [] });
});

test("whole-pack signal becomes a named high nutrient indicator", () => {
  const indicators = buildShopperIndicators(item(), [sugarSignal], "en");
  assert.equal(indicators[0].title, "HIGH ADDED SUGAR");
  assert.equal(indicators[0].tone, "red");
});

test("completed readable checks with no signal do not claim safety", () => {
  const result = buildAttentionIndicator(item({ ingredientTokens: ["water"] }), [], "en");
  assert.equal(result.level, "no_major_concern");
  assert.equal(result.title, "NO MAJOR CONCERN FOUND");
});
