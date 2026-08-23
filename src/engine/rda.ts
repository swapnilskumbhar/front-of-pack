import type { DerivedNutrient, ExtractedNutrition, WholePackSignal } from "./types.ts";

const NUTRIENTS = [
  { nutrient: "added_sugars", value: "addedSugarsG", percent: "addedSugars", unit: "g" },
  { nutrient: "saturated_fat", value: "saturatedFatG", percent: "saturatedFat", unit: "g" },
  { nutrient: "sodium", value: "sodiumMg", percent: "sodium", unit: "mg" },
  { nutrient: "total_fat", value: "totalFatG", percent: "totalFat", unit: "g" },
] as const;

export function evaluateWholePack(nutrition: ExtractedNutrition | null): WholePackSignal[] {
  if (!nutrition?.basis || !positive(nutrition.servingSize) || !positive(nutrition.netQuantity)) return [];
  const signals: WholePackSignal[] = [];
  for (const config of NUTRIENTS) {
    const per100 = nutrition.values[config.value];
    const servingPct = nutrition.printedPerServeRdaPct[config.percent];
    if (!positive(per100) || !positive(servingPct) || servingPct < 2) continue;
    const servingAmount = per100 * nutrition.servingSize / 100;
    const derivedRda = servingAmount / (servingPct / 100);
    if (!Number.isFinite(derivedRda) || derivedRda <= 0) continue;
    const wholePackAmount = per100 * nutrition.netQuantity / 100;
    const wholePackRdaPercent = wholePackAmount / derivedRda * 100;
    if (!Number.isFinite(wholePackRdaPercent) || wholePackRdaPercent < 25 || wholePackRdaPercent < servingPct * 1.5) continue;
    signals.push({
      kind: "whole_pack_rda",
      nutrient: config.nutrient as DerivedNutrient,
      severity: wholePackRdaPercent >= 50 ? "high" : wholePackRdaPercent >= 25 ? "moderate" : "info",
      wholePackAmount: round(wholePackAmount, config.unit === "mg" ? 0 : 1),
      unit: config.unit,
      wholePackRdaPercent: round(wholePackRdaPercent, 1),
      printedServingRdaPercent: round(servingPct, 1),
      servingSize: nutrition.servingSize,
      netQuantity: nutrition.netQuantity,
      quantityUnit: nutrition.basis === "per_100ml" ? "ml" : "g",
      basis: "pack_printed_rda",
    });
  }
  return signals.sort((left, right) => right.wholePackRdaPercent - left.wholePackRdaPercent).slice(0, 2);
}

function positive(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
