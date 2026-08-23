import type { AnalysisResult } from "../domain/analysis.ts";
import { evaluateClaimConsistency } from "./claim-audit.ts";
import { evaluateDiet } from "./diet-audit.ts";
import { evaluateWholePack } from "./rda.ts";
import { ENGINE_VERSION, type DerivedDecisionResult } from "./types.ts";

export * from "./rda.ts";
export * from "./presentation.ts";
export * from "./claim-audit.ts";
export * from "./diet-audit.ts";
export * from "./types.ts";

export function evaluateAnalysis(result: AnalysisResult): DerivedDecisionResult {
  return {
    engineVersion: ENGINE_VERSION,
    items: result.items.map((item) => ({
      position: item.position,
      signals: [
        ...evaluateClaimConsistency(item.claimsAsPrinted, item.ingredientTokens, item.category),
        ...evaluateWholePack(item.nutrition ?? null),
        ...evaluateDiet(item.ingredientTokens, item.printedVegMark, item.category),
      ].slice(0, 4),
    })),
  };
}

export function attachDecisions(result: AnalysisResult): AnalysisResult {
  return { ...result, derived: evaluateAnalysis(result) };
}
