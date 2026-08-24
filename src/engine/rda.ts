import type { DerivedNutrient, ExtractedNutrition, ReferenceRdaSignal, WholePackSignal } from "./types.ts";

export const FSSAI_ADULT_RDA_REFERENCE = {
  added_sugars: { amount: 50, unit: "g" },
  saturated_fat: { amount: 22, unit: "g" },
  sodium: { amount: 2_000, unit: "mg" },
  sourceUrl: "https://fssai.gov.in/upload/advisories/2022/02/6214c8ca94fedMinutes_FOPL_22_02_2022.pdf",
} as const;

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
    if (!Number.isFinite(wholePackRdaPercent) || wholePackRdaPercent < 25) continue;
    const servingSizeHidesPackImpact = wholePackRdaPercent >= servingPct * 1.5;
    if (wholePackRdaPercent < 50 && !servingSizeHidesPackImpact) continue;
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
  return signals.sort((left, right) => right.wholePackRdaPercent - left.wholePackRdaPercent);
}

export function evaluateReferenceRda(nutrition: ExtractedNutrition | null): ReferenceRdaSignal[] {
  if (!nutrition?.basis) return [];
  const configs = [
    { nutrient: "added_sugars", value: "addedSugarsG", percent: "addedSugars" },
    { nutrient: "saturated_fat", value: "saturatedFatG", percent: "saturatedFat" },
    { nutrient: "sodium", value: "sodiumMg", percent: "sodium" },
  ] as const;
  const netQuantity = positive(nutrition.netQuantity) ? nutrition.netQuantity : null;
  const servingSize = positive(nutrition.servingSize) ? nutrition.servingSize : null;
  const scope = netQuantity ? "whole_pack" : servingSize ? "per_serving" : nutrition.basis;
  const scopeAmount = netQuantity ?? servingSize ?? 100;
  const multiplier = scopeAmount / 100;
  const signals: ReferenceRdaSignal[] = [];
  for (const config of configs) {
    if (positive(nutrition.printedPerServeRdaPct[config.percent])) continue;
    const per100 = nutrition.values[config.value];
    if (!positive(per100)) continue;
    const reference = FSSAI_ADULT_RDA_REFERENCE[config.nutrient];
    const amount = per100 * multiplier;
    const rdaPercent = amount / reference.amount * 100;
    signals.push({
      kind: "reference_rda",
      nutrient: config.nutrient,
      severity: rdaPercent >= 50 ? "high" : rdaPercent >= 25 ? "moderate" : "info",
      amount: round(amount, reference.unit === "mg" ? 0 : 1),
      unit: reference.unit,
      rdaPercent: round(rdaPercent, 1),
      referenceAmount: reference.amount,
      scope,
      scopeAmount,
      source: nutrition.source === "hosted_web_search" ? "hosted_web_search" : "package",
      evidenceIds: nutrition.evidenceIds ?? [],
      basis: "fssai_adult_reference",
    });
  }
  return signals.sort((left, right) => right.rdaPercent - left.rdaPercent);
}

function positive(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
