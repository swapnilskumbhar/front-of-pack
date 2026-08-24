export const ENGINE_VERSION = "decision-engine.v7" as const;

export type NutritionBasis = "per_100g" | "per_100ml";
export type DerivedNutrient = "added_sugars" | "saturated_fat" | "sodium" | "total_fat";

export interface ExtractedNutrition {
  source?: "package" | "hosted_web_search" | null;
  evidenceIds?: string[];
  basis: NutritionBasis | null;
  servingSize: number | null;
  netQuantity: number | null;
  values: {
    addedSugarsG: number | null;
    saturatedFatG: number | null;
    sodiumMg: number | null;
    totalFatG: number | null;
  };
  printedPerServeRdaPct: {
    addedSugars: number | null;
    saturatedFat: number | null;
    sodium: number | null;
    totalFat: number | null;
  };
}

export interface ReferenceRdaSignal {
  kind: "reference_rda";
  nutrient: "added_sugars" | "saturated_fat" | "sodium";
  severity: "high" | "moderate" | "info";
  amount: number;
  unit: "g" | "mg";
  rdaPercent: number;
  referenceAmount: number;
  scope: "per_100g" | "per_100ml" | "per_serving" | "whole_pack";
  scopeAmount: number;
  source: "package" | "hosted_web_search";
  evidenceIds: string[];
  basis: "fssai_adult_reference";
}

export interface WholePackSignal {
  kind: "whole_pack_rda";
  nutrient: DerivedNutrient;
  severity: "high" | "moderate" | "info";
  wholePackAmount: number;
  unit: "g" | "mg";
  wholePackRdaPercent: number;
  printedServingRdaPercent: number;
  servingSize: number;
  netQuantity: number;
  quantityUnit: "g" | "ml";
  basis: "pack_printed_rda";
}

export interface ClaimContradictionSignal {
  kind: "claim_contradiction";
  severity: "high";
  testId: string;
  claimAsPrinted: string;
  foundIngredient: string;
  ruleId: string;
  basis: "literal_package_consistency";
}

export interface DietMatch {
  entryId: string;
  displayName: string;
  printedToken: string;
  flags: import("../knowledge/ingredient-dictionary.ts").DietFlag[];
  note: string;
  sourceUrl: string;
}

export interface DietProfileSignal {
  kind: "diet_profile";
  severity: "high" | "info";
  printedVegMark: "veg" | "non_veg" | null;
  matches: DietMatch[];
  basis: "printed_ingredients";
}

export interface VegMarkConflictSignal {
  kind: "veg_mark_conflict";
  severity: "high";
  printedVegMark: "veg";
  matches: DietMatch[];
  basis: "explicit_printed_origin";
}

export interface SourceUnclearSignal {
  kind: "source_unclear";
  severity: "info";
  matches: DietMatch[];
  basis: "ingredient_source_not_printed";
}

export interface AllergenSignal {
  kind: "allergen_profile";
  severity: "high";
  matches: DietMatch[];
  basis: "printed_ingredients";
}

export type DietarySignal = DietProfileSignal | VegMarkConflictSignal | SourceUnclearSignal | AllergenSignal;

export type DerivedSignal = WholePackSignal | ReferenceRdaSignal | ClaimContradictionSignal | DietarySignal;

export interface DerivedItemDecision {
  position: number;
  signals: DerivedSignal[];
}

export interface DerivedDecisionResult {
  engineVersion: typeof ENGINE_VERSION;
  items: DerivedItemDecision[];
}
