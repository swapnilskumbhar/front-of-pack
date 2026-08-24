import assert from "node:assert/strict";
import test from "node:test";

import type { ProductAnalysis } from "../src/domain/analysis.ts";
import { buildAttentionIndicator, buildProductProfile, buildShopperIndicators } from "../src/engine/presentation.ts";
import type { WholePackSignal } from "../src/engine/types.ts";

const item = (overrides: Partial<ProductAnalysis> = {}): ProductAnalysis => ({
  position: 1, identity: { nameAsPrinted: "Product", brandAsPrinted: null, variantAsPrinted: null, gtin: null, confidence: "high" },
  category: "food", nutrition: null, ingredientTokens: [], claimsAsPrinted: [], printedVegMark: null,
  rating: { score: null, dimension: "label_evidence", label: "Not rated", basis: "Insufficient evidence.", evidenceIds: [], experimental: true },
  profile: [],
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

test("material searched nutrition evidence cannot disappear from the shopper response", () => {
  const indicators = buildShopperIndicators(item({
    webMatchConfidence: "medium",
    evidence: [{ id: "web", origin: "hosted_web_search", excerptOrObservation: "Exact 200 g listing reports 14.37 g saturated fat per 100 g.", citationId: null, visibleOnPackage: false }],
  }), [], "en");
  assert.equal(indicators[0].title, "SATURATED FAT");
  assert.equal(indicators[0].tone, "amber");
});

test("a printed vegetarian indicator remains useful without a back panel", () => {
  const indicators = buildShopperIndicators(item({ findings: [{
    id: "veg", kind: "label_fact", level: "information", title: "Vegetarian",
    explanation: "Green vegetarian symbol is printed.", evidenceIds: [], ruleIds: [], experimental: false,
  }] }), [], "en");
  assert.equal(indicators[0].title, "VEGETARIAN");
  assert.equal(indicators[0].tone, "green");
});

test("model and deterministic sugar facts collapse into one indicator", () => {
  const indicators = buildShopperIndicators(item({ findings: [{
    id: "f", kind: "nutrition", level: "attention", title: "High sugar",
    explanation: "27 g per can.", evidenceIds: [], ruleIds: [], experimental: false,
  }] }), [sugarSignal], "en");
  assert.equal(indicators.filter((indicator) => /sugar/iu.test(indicator.title)).length, 1);
});

test("RDA enrichment keeps one nutrient line with absolute and percentage values", () => {
  const indicators = buildShopperIndicators(item({ findings: [{
    id: "f", kind: "nutrition", level: "attention", title: "Added sugar",
    explanation: "16.6 g per 100 g · online listing.", evidenceIds: ["web"], ruleIds: [], experimental: false,
  }] }), [{
    kind: "reference_rda", nutrient: "added_sugars", severity: "moderate", amount: 16.6, unit: "g",
    rdaPercent: 33.2, referenceAmount: 50, scope: "per_100g", scopeAmount: 100,
    source: "hosted_web_search", evidenceIds: ["web"], basis: "fssai_adult_reference",
  }], "en");
  const sugar = indicators.filter((indicator) => /sugar/iu.test(indicator.title));
  assert.equal(sugar.length, 1);
  assert.match(sugar[0].detail, /16\.6 g \/ 100 g · ~33\.2% RDA \(calculated\)/);
});

test("localized nutrient titles still merge with calculated RDA", () => {
  const indicators = buildShopperIndicators(item({ findings: [{
    id: "f", kind: "nutrition", level: "attention", title: "अतिरिक्त चीनी",
    explanation: "16.6 ग्राम प्रति 100 ग्राम।", evidenceIds: ["web"], ruleIds: [], experimental: false,
  }] }), [{
    kind: "reference_rda", nutrient: "added_sugars", severity: "moderate", amount: 16.6, unit: "g",
    rdaPercent: 33.2, referenceAmount: 50, scope: "per_100g", scopeAmount: 100,
    source: "hosted_web_search", evidenceIds: ["web"], basis: "fssai_adult_reference",
  }], "hi");
  assert.equal(indicators.length, 1);
  assert.match(indicators[0].detail, /33\.2% RDA/);
});

test("completed readable checks with no signal do not claim safety", () => {
  const result = buildAttentionIndicator(item({ ingredientTokens: ["water"] }), [], "en");
  assert.equal(result.level, "no_major_concern");
  assert.equal(result.title, "NO MAJOR CONCERN FOUND");
});
