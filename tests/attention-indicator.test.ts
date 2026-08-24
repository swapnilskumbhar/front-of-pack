import assert from "node:assert/strict";
import test from "node:test";

import type { ProductAnalysis } from "../src/domain/analysis.ts";
import { SUPPORTED_LANGUAGES } from "../src/domain/language.ts";
import { buildAttentionIndicator, buildProductProfile, buildShopperIndicators, formatProductIdentity } from "../src/engine/presentation.ts";
import type { AllergenSignal, WholePackSignal } from "../src/engine/types.ts";

const item = (overrides: Partial<ProductAnalysis> = {}): ProductAnalysis => ({
  position: 1, identity: { nameAsPrinted: "Product", brandAsPrinted: null, variantAsPrinted: null, gtin: null, confidence: "high" },
  category: "food", nutrition: null, ingredientTokens: [], claimsAsPrinted: [], printedVegMark: null,
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

test("product identity removes brand and variant already contained in the printed name", () => {
  assert.equal(formatProductIdentity({
    nameAsPrinted: "The Health Factory Zero Maida Whole Wheat Bread",
    brandAsPrinted: "The Health Factory",
    variantAsPrinted: "Zero Maida Whole Wheat Bread",
    gtin: null,
    confidence: "high",
  }), "The Health Factory Zero Maida Whole Wheat Bread");
});

test("model-authored issues remain named but can never create a red warning", () => {
  const indicators = buildShopperIndicators(item({ findings: [{
    id: "f", kind: "nutrition", topic: "added_sugars", level: "attention", title: "High sugar",
    explanation: "27 g per can.", evidenceIds: [], ruleIds: [], experimental: false,
  }] }), [], "en");
  assert.deepEqual(indicators[0], {
    tone: "amber", origin: "model", topic: "added_sugars", ruleId: null,
    title: "HIGH SUGAR", detail: "27 g per can.", evidenceIds: [],
  });
});

test("whole-pack signal becomes a named high nutrient indicator", () => {
  const indicators = buildShopperIndicators(item(), [sugarSignal], "en");
  assert.equal(indicators[0].title, "HIGH ADDED SUGAR");
  assert.equal(indicators[0].tone, "red");
  assert.equal(indicators[0].origin, "engine");
  assert.equal(indicators[0].ruleId, "rule-whole-pack-rda");
});

test("web evidence alone never masquerades as an analysed shopper finding", () => {
  const indicators = buildShopperIndicators(item({
    webMatchConfidence: "medium",
    evidence: [{ id: "web", origin: "hosted_web_search", excerptOrObservation: "Exact 200 g listing reports 14.37 g saturated fat per 100 g.", citationId: null, visibleOnPackage: false }],
  }), [], "en");
  assert.equal(indicators[0].title, "NOT ENOUGH INFORMATION");
  assert.equal(indicators[0].origin, "model");
});

test("a printed vegetarian indicator remains useful without a back panel", () => {
  const indicators = buildShopperIndicators(item({ findings: [{
    id: "veg", kind: "label_fact", topic: "diet", level: "information", title: "Vegetarian",
    explanation: "Green vegetarian symbol is printed.", evidenceIds: [], ruleIds: [], experimental: false,
  }] }), [], "en");
  assert.equal(indicators[0].title, "VEGETARIAN");
  assert.equal(indicators[0].tone, "green");
});

test("model and deterministic sugar facts collapse into one indicator", () => {
  const indicators = buildShopperIndicators(item({ findings: [{
    id: "f", kind: "nutrition", topic: "added_sugars", level: "attention", title: "High sugar",
    explanation: "27 g per can.", evidenceIds: [], ruleIds: [], experimental: false,
  }] }), [sugarSignal], "en");
  assert.equal(indicators.filter((indicator) => /sugar/iu.test(indicator.title)).length, 1);
});

test("RDA enrichment keeps one nutrient line with absolute and percentage values", () => {
  const indicators = buildShopperIndicators(item({ findings: [{
    id: "f", kind: "nutrition", topic: "added_sugars", level: "attention", title: "Added sugar",
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
    id: "f", kind: "nutrition", topic: "added_sugars", level: "attention", title: "अतिरिक्त चीनी",
    explanation: "16.6 ग्राम प्रति 100 ग्राम।", evidenceIds: ["web"], ruleIds: [], experimental: false,
  }] }), [{
    kind: "reference_rda", nutrient: "added_sugars", severity: "moderate", amount: 16.6, unit: "g",
    rdaPercent: 33.2, referenceAmount: 50, scope: "per_100g", scopeAmount: 100,
    source: "hosted_web_search", evidenceIds: ["web"], basis: "fssai_adult_reference",
  }], "hi");
  assert.equal(indicators.length, 1);
  assert.match(indicators[0].detail, /33\.2% RDA/);
});

test("moderate whole-pack sodium merges into one engine-owned sodium indicator", () => {
  const indicators = buildShopperIndicators(item({ findings: [{
    id: "f", kind: "nutrition", topic: "sodium", level: "attention", title: "Sodium",
    explanation: "226 mg per 100 ml.", evidenceIds: ["pack"], ruleIds: [], experimental: false,
  }] }), [{
    kind: "whole_pack_rda", nutrient: "sodium", severity: "moderate", wholePackAmount: 678,
    unit: "mg", wholePackRdaPercent: 33.8, printedServingRdaPercent: 16.9, servingSize: 150,
    netQuantity: 300, quantityUnit: "ml", basis: "pack_printed_rda",
  }], "en");
  const sodium = indicators.filter((indicator) => indicator.topic === "sodium");
  assert.equal(sodium.length, 1);
  assert.equal(sodium[0].title, "SODIUM");
  assert.equal(sodium[0].origin, "engine");
  assert.equal(sodium[0].tone, "amber");
  assert.match(sodium[0].detail, /678 mg.*33\.8%/);
});

test("structured indicator order is identical across all supported languages", () => {
  const allergen: AllergenSignal = {
    kind: "allergen_profile", severity: "high", basis: "printed_ingredients",
    matches: [{ entryId: "wheat", displayName: "Wheat", printedToken: "wheat", flags: ["common_allergen"], note: "Printed allergen.", sourceUrl: "https://example.test/wheat" }],
  };
  const sodium: WholePackSignal = {
    kind: "whole_pack_rda", nutrient: "sodium", severity: "moderate", wholePackAmount: 678,
    unit: "mg", wholePackRdaPercent: 33.8, printedServingRdaPercent: 16.9, servingSize: 150,
    netQuantity: 300, quantityUnit: "ml", basis: "pack_printed_rda",
  };
  const makeItem = (warningTitle: string, additiveTitle: string) => item({ findings: [
    { id: "warning", kind: "regulatory_context", topic: "statutory_warning", level: "attention", title: warningTitle, explanation: "Avoid for restricted groups.", evidenceIds: [], ruleIds: [], experimental: false },
    { id: "additive", kind: "ingredient", topic: "preservatives", level: "attention", title: additiveTitle, explanation: "Declared additive.", evidenceIds: [], ruleIds: [], experimental: false },
  ] });
  const semanticOrder = (language: (typeof SUPPORTED_LANGUAGES)[number], value: ProductAnalysis) =>
    buildShopperIndicators(value, [sugarSignal, sodium, allergen], language)
      .map(({ origin, topic, tone }) => `${origin}:${topic}:${tone}`);
  const expected = [
    "model:statutory_warning:amber",
    "engine:allergen:red",
    "engine:added_sugars:red",
    "engine:sodium:amber",
    "model:preservatives:amber",
  ];
  for (const language of SUPPORTED_LANGUAGES) {
    assert.deepEqual(semanticOrder(language, makeItem("Caffeine warning", "Contains preservative")), expected, language);
  }
});

test("engine allergen replaces the matching model topic and remains red", () => {
  const allergen: AllergenSignal = {
    kind: "allergen_profile", severity: "high", basis: "printed_ingredients",
    matches: [{ entryId: "wheat", displayName: "Wheat", printedToken: "wheat", flags: ["common_allergen"], note: "Printed allergen.", sourceUrl: "https://example.test/wheat" }],
  };
  const indicators = buildShopperIndicators(item({ findings: [{
    id: "f", kind: "ingredient", topic: "allergen", level: "attention", title: "Allergens",
    explanation: "Wheat is printed.", evidenceIds: ["pack"], ruleIds: [], experimental: false,
  }] }), [allergen], "en");
  assert.equal(indicators.filter((indicator) => indicator.topic === "allergen").length, 1);
  assert.equal(indicators[0].origin, "engine");
  assert.equal(indicators[0].tone, "red");
});

test("sodium benzoate and total sugar never merge into nutrient warning topics", () => {
  const indicators = buildShopperIndicators(item({ findings: [
    { id: "p", kind: "ingredient", topic: "preservatives", level: "attention", title: "Contains sodium benzoate", explanation: "Preservative is printed.", evidenceIds: [], ruleIds: [], experimental: false },
    { id: "t", kind: "nutrition", topic: "total_sugars", level: "attention", title: "High total sugar", explanation: "Total sugar is printed.", evidenceIds: [], ruleIds: [], experimental: false },
  ] }), [sugarSignal, {
    kind: "whole_pack_rda", nutrient: "sodium", severity: "high", wholePackAmount: 1_100,
    unit: "mg", wholePackRdaPercent: 55, printedServingRdaPercent: 25, servingSize: 100,
    netQuantity: 200, quantityUnit: "ml", basis: "pack_printed_rda",
  }], "en");
  assert.equal(indicators.filter((indicator) => indicator.topic === "preservatives").length, 1);
  assert.equal(indicators.find((indicator) => indicator.topic === "preservatives")?.origin, "model");
  assert.equal(indicators.filter((indicator) => indicator.topic === "total_sugars").length, 1);
  assert.equal(indicators.filter((indicator) => indicator.topic === "added_sugars").length, 1);
  assert.equal(indicators.filter((indicator) => indicator.topic === "sodium").length, 1);
  assert.ok(indicators.filter((indicator) => indicator.origin === "model").every((indicator) => indicator.tone !== "red"));
});

test("moderate reference RDA is amber, not green", () => {
  const indicators = buildShopperIndicators(item(), [{
    kind: "reference_rda", nutrient: "sodium", severity: "moderate", amount: 600, unit: "mg",
    rdaPercent: 30, referenceAmount: 2_000, scope: "whole_pack", scopeAmount: 300,
    source: "package", evidenceIds: ["pack"], basis: "fssai_adult_reference",
  }], "en");
  assert.equal(indicators[0].topic, "sodium");
  assert.equal(indicators[0].tone, "amber");
  assert.equal(indicators[0].origin, "engine");
});

test("completed readable checks with no signal do not claim safety", () => {
  const result = buildAttentionIndicator(item({ ingredientTokens: ["water"] }), [], "en");
  assert.equal(result.level, "no_major_concern");
  assert.equal(result.title, "NO MAJOR CONCERN FOUND");
});
