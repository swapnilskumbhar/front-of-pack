import type {
  DerivedNutrient,
  DerivedRating,
  DerivedSignal,
  RatingDeduction,
} from "./types.ts";

export const RATING_STARTING_SCORE = 10;

export const RATING_DEDUCTION_RULES = [
  { id: "nutrition_high", points: 3, label: "High whole-pack or reference nutrition signal" },
  { id: "nutrition_moderate", points: 2, label: "Moderate whole-pack or reference nutrition signal" },
  { id: "claim_contradiction", points: 3, label: "Printed claim contradicts a printed ingredient" },
  { id: "veg_mark_conflict", points: 2, label: "Vegetarian mark conflicts with an explicit printed source" },
  { id: "allergen_profile", points: 1, label: "Common allergen identified in printed ingredients" },
  { id: "diet_profile", points: 1, label: "Explicit animal- or insect-derived dietary match" },
] as const;
type RatingDeductionRuleId = (typeof RATING_DEDUCTION_RULES)[number]["id"];
const RATING_POINTS = Object.fromEntries(
  RATING_DEDUCTION_RULES.map((rule) => [rule.id, rule.points]),
) as Record<RatingDeductionRuleId, number>;

export function ratingBand(score: number | null): string {
  if (score === null) return "Not enough rule-based evidence";
  if (score >= 9) return "Few rule-based deductions";
  if (score >= 7) return "Limited deductions";
  if (score >= 5) return "Mixed label signals";
  if (score >= 3) return "Several material deductions";
  return "Strong caution from available evidence";
}

interface DeductionCandidate extends RatingDeduction {
  dedupeKey: string;
  magnitude: number;
  sourcePriority: number;
}

const NUTRIENT_LABELS: Record<DerivedNutrient, string> = {
  added_sugars: "Added sugars",
  saturated_fat: "Saturated fat",
  sodium: "Sodium",
  total_fat: "Total fat",
};

export function computeRating(signals: readonly DerivedSignal[]): DerivedRating {
  const byTopic = new Map<string, DeductionCandidate>();

  for (const signal of signals) {
    const candidate = toDeduction(signal);
    if (!candidate) continue;
    const current = byTopic.get(candidate.dedupeKey);
    if (!current || compareWithinTopic(candidate, current) < 0) {
      byTopic.set(candidate.dedupeKey, candidate);
    }
  }

  const deductions = [...byTopic.values()]
    .sort(compareDeduction)
    .map(({ ruleId, points, reason }) => ({ ruleId, points, reason }));
  const totalPoints = deductions.reduce((sum, deduction) => sum + deduction.points, 0);

  return {
    score: deductions.length ? Math.max(0, RATING_STARTING_SCORE - totalPoints) : null,
    deductions,
  };
}

function toDeduction(signal: DerivedSignal): DeductionCandidate | null {
  switch (signal.kind) {
    case "whole_pack_rda": {
      const points = nutritionPoints(signal.severity);
      if (points === 0) return null;
      return {
        dedupeKey: `nutrition:${signal.nutrient}`,
        magnitude: signal.wholePackRdaPercent,
        sourcePriority: 0,
        ruleId: `engine.whole_pack_rda.${signal.nutrient}`,
        points,
        reason: `${NUTRIENT_LABELS[signal.nutrient]} is ${severityLabel(signal.severity)} for the whole pack (${signal.wholePackRdaPercent}% of the pack-derived daily reference).`,
      };
    }
    case "reference_rda": {
      const points = nutritionPoints(signal.severity);
      if (points === 0) return null;
      return {
        dedupeKey: `nutrition:${signal.nutrient}`,
        magnitude: signal.rdaPercent,
        sourcePriority: 1,
        ruleId: `engine.reference_rda.${signal.nutrient}`,
        points,
        reason: `${NUTRIENT_LABELS[signal.nutrient]} is ${severityLabel(signal.severity)} for ${scopeLabel(signal.scope)} (${signal.rdaPercent}% of the FSSAI adult reference).`,
      };
    }
    case "claim_contradiction":
      return {
        dedupeKey: `claim:${signal.testId}`,
        magnitude: 0,
        sourcePriority: 0,
        ruleId: signal.ruleId,
        points: RATING_POINTS.claim_contradiction,
        reason: `The printed claim “${signal.claimAsPrinted}” conflicts with the printed ingredient “${signal.foundIngredient}”.`,
      };
    case "veg_mark_conflict":
      return {
        dedupeKey: "diet:explicit-origin",
        magnitude: 0,
        sourcePriority: 0,
        ruleId: "engine.veg_mark_conflict",
        points: RATING_POINTS.veg_mark_conflict,
        reason: "The vegetarian mark conflicts with an explicitly animal- or insect-derived printed ingredient.",
      };
    case "allergen_profile":
      return {
        dedupeKey: "diet:allergen-profile",
        magnitude: 0,
        sourcePriority: 0,
        ruleId: "engine.allergen_profile",
        points: RATING_POINTS.allergen_profile,
        reason: "Printed ingredients include at least one common allergen match.",
      };
    case "diet_profile":
      if (signal.severity === "info") return null;
      return {
        dedupeKey: "diet:explicit-origin",
        magnitude: 0,
        sourcePriority: 1,
        ruleId: "engine.diet_profile",
        points: RATING_POINTS.diet_profile,
        reason: "Printed ingredients include an explicitly animal- or insect-derived dietary match.",
      };
    case "source_unclear":
      return null;
    default: {
      const exhaustive: never = signal;
      return exhaustive;
    }
  }
}

function nutritionPoints(severity: "high" | "moderate" | "info"): number {
  if (severity === "high") return RATING_POINTS.nutrition_high;
  if (severity === "moderate") return RATING_POINTS.nutrition_moderate;
  return 0;
}

function severityLabel(severity: "high" | "moderate" | "info"): string {
  if (severity === "high") return "high";
  if (severity === "moderate") return "moderate";
  return "informational";
}

function scopeLabel(scope: "per_100g" | "per_100ml" | "per_serving" | "whole_pack"): string {
  if (scope === "per_100g") return "100 g";
  if (scope === "per_100ml") return "100 ml";
  if (scope === "per_serving") return "one serving";
  return "the whole pack";
}

function compareWithinTopic(left: DeductionCandidate, right: DeductionCandidate): number {
  return right.points - left.points ||
    left.sourcePriority - right.sourcePriority ||
    right.magnitude - left.magnitude ||
    compareText(left.ruleId, right.ruleId) ||
    compareText(left.reason, right.reason);
}

function compareDeduction(left: DeductionCandidate, right: DeductionCandidate): number {
  return right.points - left.points ||
    compareText(left.ruleId, right.ruleId) ||
    compareText(left.reason, right.reason);
}

function compareText(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
