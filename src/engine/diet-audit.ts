import type { ProductCategory } from "../domain/analysis.ts";
import { INGREDIENT_DICTIONARY, type DietFlag } from "../knowledge/ingredient-dictionary.ts";
import type { AllergenSignal, DietMatch, DietProfileSignal, DietarySignal, SourceUnclearSignal, VegMarkConflictSignal } from "./types.ts";

const EXPLICIT_ORIGIN_FLAGS = new Set<DietFlag>(["animal_derived", "insect_derived", "milk_derived", "egg_derived"]);

export function evaluateDiet(
  ingredientTokens: readonly string[] | undefined,
  printedVegMark: "veg" | "non_veg" | null | undefined,
  _category: ProductCategory,
): DietarySignal[] {
  void _category;
  if (!ingredientTokens?.length) return [];
  const matches = matchIngredients(ingredientTokens);
  if (!matches.length) return [];

  const explicit = matches.filter((match) => match.flags.some((flag) => EXPLICIT_ORIGIN_FLAGS.has(flag)));
  const unclear = matches.filter((match) => match.flags.includes("may_be_animal_derived"));
  const jain = matches.filter((match) => match.flags.includes("jain_excluded"));
  const allergens = matches.filter((match) => match.flags.includes("common_allergen"));
  const signals: DietarySignal[] = [];

  if (printedVegMark === "veg" && explicit.length) {
    const signal: VegMarkConflictSignal = { kind: "veg_mark_conflict", severity: "high", printedVegMark: "veg", matches: explicit, basis: "explicit_printed_origin" };
    signals.push(signal);
  } else if (explicit.length || jain.length) {
    const signal: DietProfileSignal = { kind: "diet_profile", severity: explicit.length ? "high" : "info", printedVegMark: printedVegMark ?? null, matches: uniqueMatches([...explicit, ...jain]), basis: "printed_ingredients" };
    signals.push(signal);
  }
  if (allergens.length) {
    const signal: AllergenSignal = { kind: "allergen_profile", severity: "high", matches: allergens, basis: "printed_ingredients" };
    signals.push(signal);
  }
  if (unclear.length) {
    const signal: SourceUnclearSignal = { kind: "source_unclear", severity: "info", matches: unclear, basis: "ingredient_source_not_printed" };
    signals.push(signal);
  }
  return signals;
}

function matchIngredients(tokens: readonly string[]): DietMatch[] {
  const matches: DietMatch[] = [];
  for (const entry of INGREDIENT_DICTIONARY) {
    const printedToken = tokens.find((token) => entry.tokens.some((needle) => containsToken(normalize(token), normalize(needle))));
    if (!printedToken) continue;
    matches.push({ entryId: entry.id, displayName: entry.displayName, printedToken, flags: [...entry.flags], note: entry.note, sourceUrl: entry.sourceUrl });
  }
  return matches;
}

function uniqueMatches(matches: DietMatch[]): DietMatch[] {
  return [...new Map(matches.map((match) => [match.entryId, match])).values()];
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/gu, " ").trim();
}

function containsToken(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "u").test(haystack);
}
