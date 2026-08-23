import type { AnalysisResult } from "../domain/analysis.ts";
import { evaluateWholePack } from "./rda.ts";
import { ENGINE_VERSION, type DerivedDecisionResult } from "./types.ts";

export * from "./rda.ts";
export * from "./presentation.ts";
export * from "./types.ts";

export function evaluateAnalysis(result: AnalysisResult): DerivedDecisionResult {
  return {
    engineVersion: ENGINE_VERSION,
    items: result.items.map((item) => ({ position: item.position, signals: evaluateWholePack(item.nutrition ?? null) })),
  };
}

export function attachDecisions(result: AnalysisResult): AnalysisResult {
  return { ...result, derived: evaluateAnalysis(result) };
}
