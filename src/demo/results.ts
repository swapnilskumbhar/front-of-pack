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

function result(items: ProductAnalysis[], summary: string, real = true): AnalysisResult {
  return attachDecisions({ schemaVersion: "analysis-result.v1", language: "en", analyzedCount: items.length,
    unknownCount: 0, flaggedCount: 0, truncated: false, wholeImageSummary: summary,
    strongestMaterialFinding: null, items, disclaimer: real
      ? "Cached result from a real Front of Pack analysis run on 23 August 2026."
      : "Cached demonstration from a fixed synthetic multi-product fixture." });
}

const haldirams = baseItem(1, "RATLAMI SEV", "food");
haldirams.identity = { nameAsPrinted: "RATLAMI SEV", brandAsPrinted: "Haldiram’s", variantAsPrinted: null, gtin: null, confidence: "high" };
haldirams.printedVegMark = "veg";
haldirams.claimsAsPrinted = ["Extruded Snack of Bengal Gram Flour with Pinch of Clove.", "PRODUCT OF INDIA"];
haldirams.findings = [{ id: "h1", kind: "label_fact", level: "attention", title: "Back panel needed", explanation: "Allergen advice and nutrition are not visible; verify them on the rear panel.", evidenceIds: ["he1"], ruleIds: ["in.fssai.labelling-display-2020.v1"], experimental: false }];
haldirams.evidence = [
  { id: "he1", origin: "package", excerptOrObservation: "Only the front panel is shown; no ingredient list, allergen statement or nutrition panel is readable.", citationId: null, visibleOnPackage: true },
  { id: "he2", origin: "hosted_web_search", excerptOrObservation: "The official matching 200 g page lists chickpea flour, oil and spices; confirm this pack’s rear label because recipes can change.", citationId: "hc1", visibleOnPackage: false },
];
haldirams.citations = [{ id: "hc1", title: "Ratlami Sev (200 gms) — Haldiram Foods", url: "https://haldiramfoods.com/product/ratlami-sev-200-gms/", providerSourceId: "https://haldiramfoods.com/product/ratlami-sev-200-gms/" }];
haldirams.needsClearerImage = true;
haldirams.retakeGuidance = "Photograph the full back panel to confirm ingredients, allergens and nutrition.";

const bread = baseItem(1, "Fibre Up", "food");
bread.identity = { nameAsPrinted: "Fibre Up", brandAsPrinted: "English Oven", variantAsPrinted: "For a Happy Gut", gtin: "8906001387114", confidence: "high" };
bread.printedVegMark = "veg";
bread.ingredientTokens = ["whole wheat flour", "oats", "soy flour", "sesame seeds", "wheat gluten", "sugar"];
bread.nutrition = { basis: "per_100g", servingSize: 55, netQuantity: 400,
  values: { addedSugarsG: 1.93, saturatedFatG: 1.1, sodiumMg: 435, totalFatG: 3.09 },
  printedPerServeRdaPct: { addedSugars: 2, saturatedFat: 2.8, sodium: 12, totalFat: 3 } };
bread.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1"], limitations: [] };
bread.findings = [{ id: "b1", kind: "ingredient", level: "attention", title: "Allergens printed", explanation: "The pack declares wheat, oats, soy and sesame.", evidenceIds: ["be1"], ruleIds: ["in.fssai.labelling-display-2020.v1"], experimental: false }];
bread.evidence = [{ id: "be1", origin: "package", excerptOrObservation: "Allergen declaration states wheat, oats, soy and sesame seeds.", citationId: null, visibleOnPackage: true }];

const cartNames = ["Fruit Drink", "Breakfast Cereal", "Face Wash", "Dishwash Gel", "Baby Lotion", "Pet Treats"];
const cartCategories: ProductAnalysis["category"][] = ["beverage", "food", "personal_care", "household", "baby_care", "pet_care"];
const cart = cartNames.map((name, index) => baseItem(index + 1, name, cartCategories[index]));

export const DEMO_RESULTS: Record<string, AnalysisResult> = {
  haldirams: result([haldirams], "A front-only Haldiram’s pack triggers a provisional official-source lookup."),
  bread: result([bread], "A real bread label supports whole-pack and allergen checks."),
  cart: result(cart, "Six products identified from one shopping-cart image.", false),
};

export const DEMO_LABELS = [
  { id: "haldirams", label: "Front-only search", detail: "Real pack · official match", imageSrc: "/demo/haldirams-ratlami-sev.jpeg" },
  { id: "bread", label: "Whole-pack reality", detail: "Real pack · allergens", imageSrc: "/demo/english-oven-fibre-up.jpeg" },
  { id: "cart", label: "Six products", detail: "Synthetic until photo supplied", imageSrc: null },
] as const;
