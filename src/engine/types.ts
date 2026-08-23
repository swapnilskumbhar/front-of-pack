export const ENGINE_VERSION = "decision-engine.v1" as const;

export type NutritionBasis = "per_100g" | "per_100ml";
export type DerivedNutrient = "added_sugars" | "saturated_fat" | "sodium" | "total_fat";

export interface ExtractedNutrition {
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

export type DerivedSignal = WholePackSignal | ClaimContradictionSignal;

export interface DerivedItemDecision {
  position: number;
  signals: DerivedSignal[];
}

export interface DerivedDecisionResult {
  engineVersion: typeof ENGINE_VERSION;
  items: DerivedItemDecision[];
}
