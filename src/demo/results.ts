import type { AnalysisResult, ProductAnalysis } from "../domain/analysis.ts";
import { attachDecisions } from "../engine/index.ts";

const baseItem = (position: number, name: string, category: ProductAnalysis["category"]): ProductAnalysis => ({
  position,
  identity: { nameAsPrinted: name, brandAsPrinted: "Demo Pack", variantAsPrinted: null, gtin: null, confidence: "high" },
  category, nutrition: null, ingredientTokens: [], claimsAsPrinted: [],
  coverage: { tier: category === "food" || category === "beverage" ? "category_rules" : "general_pack_rules", rulePackIds: [], limitations: [] },
  summary: name, findings: [], claimAudits: [], evidence: [], citations: [], serviceRoute: null,
  needsClearerImage: false, retakeGuidance: null,
});

function result(items: ProductAnalysis[], summary: string): AnalysisResult {
  return attachDecisions({ schemaVersion: "analysis-result.v1", language: "en", analyzedCount: items.length,
    unknownCount: 0, flaggedCount: 0, truncated: false, wholeImageSummary: summary,
    strongestMaterialFinding: null, items, disclaimer: "Cached demonstration from a fixed synthetic pack fixture." });
}

const shampoo = baseItem(1, "Everyday Shampoo", "personal_care");
shampoo.identity.variantAsPrinted = "100% Natural · Sulphate Free";
shampoo.claimsAsPrinted = ["100% Natural", "Sulphate Free"];
shampoo.ingredientTokens = ["aqua", "sles", "cocamidopropyl betaine", "fragrance"];
shampoo.coverage = { tier: "category_rules", rulePackIds: ["in.cdsco.cosmetics-rules-2020-labelling.v1"], limitations: [] };

const chips = baseItem(1, "Masala Potato Chips", "food");
chips.nutrition = { basis: "per_100g", servingSize: 20, netQuantity: 52,
  values: { addedSugarsG: 0, saturatedFatG: 12.6, sodiumMg: 890, totalFatG: 33.4 },
  printedPerServeRdaPct: { addedSugars: null, saturatedFat: 11, sodium: 9, totalFat: 10 } };
chips.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1"], limitations: [] };

const cartNames = ["Fruit Drink", "Breakfast Cereal", "Face Wash", "Dishwash Gel", "Baby Lotion", "Pet Treats"];
const cartCategories: ProductAnalysis["category"][] = ["beverage", "food", "personal_care", "household", "baby_care", "pet_care"];
const cart = cartNames.map((name, index) => baseItem(index + 1, name, cartCategories[index]));

export const DEMO_RESULTS: Record<string, AnalysisResult> = {
  shampoo: result([shampoo], "A literal claim and ingredient contradiction is visible."),
  chips: result([chips], "The packet contains more than one printed serving."),
  cart: result(cart, "Six products identified from one shopping-cart image."),
};

export const DEMO_LABELS = [
  { id: "shampoo", label: "Claim contradiction", detail: "Sulphate Free ↔ SLES" },
  { id: "chips", label: "Serving reality", detail: "20 g serving ↔ 52 g pack" },
  { id: "cart", label: "Six products", detail: "Multi-category cart" },
] as const;
