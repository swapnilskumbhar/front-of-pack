import type { ProductCategory } from "../domain/analysis.ts";
import { CLAIM_TESTS } from "../knowledge/claim-tests.ts";
import type { ClaimContradictionSignal } from "./types.ts";

export function evaluateClaimConsistency(
  claimsAsPrinted: readonly string[] | undefined,
  ingredientTokens: readonly string[] | undefined,
  category: ProductCategory,
): ClaimContradictionSignal[] {
  if (!claimsAsPrinted?.length || !ingredientTokens?.length) return [];
  const normalizedIngredients = ingredientTokens.map(normalize);
  const signals: ClaimContradictionSignal[] = [];
  for (const test of CLAIM_TESTS) {
    if (!test.categories.includes(category)) continue;
    const claim = claimsAsPrinted.find((candidate) => test.claimPatterns.some((pattern) => pattern.test(candidate)));
    if (!claim) continue;
    const foundIngredient = test.contradictingIngredients.find((needle) =>
      normalizedIngredients.some((ingredient) => containsIngredient(ingredient, needle)));
    if (!foundIngredient) continue;
    signals.push({
      kind: "claim_contradiction", severity: "high", testId: test.id,
      claimAsPrinted: claim, foundIngredient, ruleId: test.ruleId,
      basis: "literal_package_consistency",
    });
  }
  return signals.slice(0, 2);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/gu, " ").trim();
}

function containsIngredient(haystack: string, needle: string): boolean {
  const escaped = normalize(needle).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "u").test(haystack);
}
