import assert from "node:assert/strict";
import test from "node:test";

import type { AnalysisResult } from "../src/domain/analysis.ts";
import { computeRating, evaluateAnalysis } from "../src/engine/index.ts";
import type {
  AllergenSignal,
  ClaimContradictionSignal,
  DerivedSignal,
  DietMatch,
  DietProfileSignal,
  ReferenceRdaSignal,
  SourceUnclearSignal,
  VegMarkConflictSignal,
  WholePackSignal,
} from "../src/engine/types.ts";

const animalMatch: DietMatch = {
  entryId: "gelatin",
  displayName: "Gelatin",
  printedToken: "gelatin",
  flags: ["animal_derived"],
  note: "Animal-derived ingredient.",
  sourceUrl: "https://example.com/gelatin",
};

const allergenMatch: DietMatch = {
  entryId: "milk",
  displayName: "Milk",
  printedToken: "milk solids",
  flags: ["milk_derived", "common_allergen"],
  note: "Milk-derived ingredient.",
  sourceUrl: "https://example.com/milk",
};

function wholePack(
  nutrient: WholePackSignal["nutrient"],
  severity: WholePackSignal["severity"],
  percent: number,
): WholePackSignal {
  return {
    kind: "whole_pack_rda",
    nutrient,
    severity,
    wholePackAmount: 30,
    unit: nutrient === "sodium" ? "mg" : "g",
    wholePackRdaPercent: percent,
    printedServingRdaPercent: 20,
    servingSize: 50,
    netQuantity: 100,
    quantityUnit: "g",
    basis: "pack_printed_rda",
  };
}

function referenceRda(
  nutrient: ReferenceRdaSignal["nutrient"],
  severity: ReferenceRdaSignal["severity"],
  percent: number,
): ReferenceRdaSignal {
  return {
    kind: "reference_rda",
    nutrient,
    severity,
    amount: 30,
    unit: nutrient === "sodium" ? "mg" : "g",
    rdaPercent: percent,
    referenceAmount: nutrient === "sodium" ? 2_000 : nutrient === "added_sugars" ? 50 : 22,
    scope: "whole_pack",
    scopeAmount: 100,
    source: "package",
    evidenceIds: ["package-nutrition"],
    basis: "fssai_adult_reference",
  };
}

function claim(testId: string, claimAsPrinted = "No Added Sugar"): ClaimContradictionSignal {
  return {
    kind: "claim_contradiction",
    severity: "high",
    testId,
    claimAsPrinted,
    foundIngredient: "sugar",
    ruleId: "in.fssai.advertising-claims-2018.v1",
    basis: "literal_package_consistency",
  };
}

const vegConflict: VegMarkConflictSignal = {
  kind: "veg_mark_conflict",
  severity: "high",
  printedVegMark: "veg",
  matches: [animalMatch],
  basis: "explicit_printed_origin",
};

const allergen: AllergenSignal = {
  kind: "allergen_profile",
  severity: "high",
  matches: [allergenMatch],
  basis: "printed_ingredients",
};

const highDietProfile: DietProfileSignal = {
  kind: "diet_profile",
  severity: "high",
  printedVegMark: null,
  matches: [animalMatch],
  basis: "printed_ingredients",
};

const infoDietProfile: DietProfileSignal = {
  ...highDietProfile,
  severity: "info",
};

const sourceUnclear: SourceUnclearSignal = {
  kind: "source_unclear",
  severity: "info",
  matches: [animalMatch],
  basis: "ingredient_source_not_printed",
};

test("assigns fixed points to every material signal kind and ignores informational signals", () => {
  const cases: Array<[DerivedSignal, number]> = [
    [wholePack("added_sugars", "high", 60), 3],
    [wholePack("saturated_fat", "moderate", 35), 2],
    [referenceRda("sodium", "high", 55), 3],
    [referenceRda("added_sugars", "moderate", 30), 2],
    [claim("claim.no-added-sugar"), 3],
    [vegConflict, 2],
    [allergen, 1],
    [highDietProfile, 1],
    [wholePack("total_fat", "info", 20), 0],
    [referenceRda("sodium", "info", 20), 0],
    [infoDietProfile, 0],
    [sourceUnclear, 0],
  ];

  for (const [signal, expectedPoints] of cases) {
    const result = computeRating([signal]);
    assert.equal(result.score, expectedPoints ? 10 - expectedPoints : null, signal.kind);
    assert.equal(result.deductions.reduce((sum, deduction) => sum + deduction.points, 0), expectedPoints, signal.kind);
  }
});

test("deduplicates overlapping topics and returns a stable order for any input order", () => {
  const signals: DerivedSignal[] = [
    referenceRda("added_sugars", "high", 80),
    wholePack("added_sugars", "high", 55),
    wholePack("added_sugars", "high", 70),
    claim("claim.no-added-sugar"),
    highDietProfile,
    vegConflict,
    allergen,
  ];

  const forward = computeRating(signals);
  const reverse = computeRating([...signals].reverse());

  assert.deepEqual(reverse, forward);
  assert.equal(forward.score, 1);
  assert.deepEqual(forward.deductions.map((deduction) => deduction.ruleId), [
    "engine.whole_pack_rda.added_sugars",
    "in.fssai.advertising-claims-2018.v1",
    "engine.veg_mark_conflict",
    "engine.allergen_profile",
  ]);
  assert.match(forward.deductions[0].reason, /70%/u);
});

test("keeps the strongest nutrition deduction across whole-pack and reference signals", () => {
  const result = computeRating([
    wholePack("sodium", "moderate", 35),
    referenceRda("sodium", "high", 60),
  ]);

  assert.equal(result.score, 7);
  assert.equal(result.deductions.length, 1);
  assert.equal(result.deductions[0].ruleId, "engine.reference_rda.sodium");
});

test("floors the score at zero without discarding fixed deductions", () => {
  const result = computeRating([
    wholePack("added_sugars", "high", 60),
    wholePack("saturated_fat", "high", 60),
    wholePack("sodium", "high", 60),
    wholePack("total_fat", "high", 60),
  ]);

  assert.equal(result.score, 0);
  assert.equal(result.deductions.reduce((sum, deduction) => sum + deduction.points, 0), 12);
});

test("evaluateAnalysis attaches the same derived rating without using the model score", () => {
  const analysis: AnalysisResult = {
    schemaVersion: "analysis-result.v3",
    language: "en",
    analyzedCount: 1,
    unknownCount: 0,
    flaggedCount: 1,
    truncated: false,
    wholeImageSummary: "One product analysed.",
    strongestMaterialFinding: "Added sugar claim contradiction.",
    items: [{
      position: 1,
      identity: { nameAsPrinted: "Drink", brandAsPrinted: null, variantAsPrinted: null, gtin: null, confidence: "high" },
      category: "beverage",
      nutrition: {
        source: "package",
        evidenceIds: ["package-nutrition"],
        basis: "per_100ml",
        servingSize: 100,
        netQuantity: 100,
        values: { addedSugarsG: 25, saturatedFatG: null, sodiumMg: null, totalFatG: null },
        printedPerServeRdaPct: { addedSugars: null, saturatedFat: null, sodium: null, totalFat: null },
      },
      ingredientTokens: ["sugar"],
      claimsAsPrinted: ["No Added Sugar"],
      printedVegMark: null,
      webMatchConfidence: null,
      webMatchBasis: null,
      profile: [],
      coverage: { tier: "category_rules", rulePackIds: [], limitations: [] },
      summary: "Model verdict.",
      findings: [],
      claimAudits: [],
      evidence: [],
      citations: [],
      serviceRoute: null,
      needsClearerImage: false,
      retakeGuidance: null,
    }],
    disclaimer: "Experimental label analysis.",
  };

  const first = evaluateAnalysis(analysis);
  const second = evaluateAnalysis(analysis);

  assert.deepEqual(second, first);
  assert.equal(first.items[0].rating.score, 4);
  assert.equal(first.items[0].rating.deductions.length, 2);
});
