import type { AnalysisResult } from "../domain/analysis.ts";
import { evaluateClaimConsistency } from "./claim-audit.ts";
import { evaluateDiet } from "./diet-audit.ts";
import { evaluateReferenceRda, evaluateWholePack } from "./rda.ts";
import { computeRating } from "./rating.ts";
import { ENGINE_VERSION, type DerivedDecisionResult } from "./types.ts";

export * from "./rda.ts";
export * from "./presentation.ts";
export * from "./claim-audit.ts";
export * from "./diet-audit.ts";
export * from "./rating.ts";
export * from "./types.ts";

export function evaluateAnalysis(result: AnalysisResult): DerivedDecisionResult {
  return {
    engineVersion: ENGINE_VERSION,
    items: result.items.map((item) => {
      const signals = [
        ...evaluateClaimConsistency(item.claimsAsPrinted, item.ingredientTokens, item.category),
        ...evaluateWholePack(item.nutrition ?? null),
        ...evaluateReferenceRda(item.nutrition ?? null),
        ...evaluateDiet(item.ingredientTokens, item.printedVegMark, item.category),
      ];
      return { position: item.position, signals, rating: computeRating(signals) };
    }),
  };
}

export function attachDecisions(result: AnalysisResult): AnalysisResult {
  const derived = evaluateAnalysis(result);
  const flaggedCount = derived.items.filter((item) =>
    item.signals.some((signal) => signal.severity === "high" || signal.severity === "moderate"),
  ).length;
  return { ...result, flaggedCount, derived };
}
