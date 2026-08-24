import type { AnalysisResult, ProductAnalysis } from "../domain/analysis.ts";
import { attachDecisions } from "../engine/index.ts";

const baseItem = (position: number, name: string, category: ProductAnalysis["category"]): ProductAnalysis => ({
  position,
  identity: { nameAsPrinted: name, brandAsPrinted: "Demo Pack", variantAsPrinted: null, gtin: null, confidence: "high" },
  category, nutrition: null, ingredientTokens: [], claimsAsPrinted: [],
  rating: { score: null, dimension: "label_evidence", label: "Not rated", basis: "Insufficient evidence.", evidenceIds: [], experimental: true },
  profile: [],
  coverage: { tier: category === "food" || category === "beverage" ? "category_rules" : "general_pack_rules", rulePackIds: [], limitations: [] },
  summary: name, findings: [], claimAudits: [], evidence: [], citations: [], serviceRoute: null,
  needsClearerImage: false, retakeGuidance: null,
});

function result(items: ProductAnalysis[], summary: string, real = true): AnalysisResult {
  return attachDecisions({ schemaVersion: "analysis-result.v2", language: "en", analyzedCount: items.length,
    unknownCount: 0, flaggedCount: 0, truncated: false, wholeImageSummary: summary,
    strongestMaterialFinding: null, items, disclaimer: real
      ? "Cached result from a real Front of Pack analysis run on 23 August 2026."
      : "Cached demonstration from a fixed synthetic multi-product fixture." });
}

const haldirams = baseItem(1, "RATLAMI SEV", "food");
haldirams.identity = { nameAsPrinted: "RATLAMI SEV", brandAsPrinted: "Haldiram’s", variantAsPrinted: null, gtin: null, confidence: "high" };
haldirams.printedVegMark = "veg";
haldirams.claimsAsPrinted = ["Extruded Snack of Bengal Gram Flour with Pinch of Clove.", "PRODUCT OF INDIA"];
haldirams.webMatchConfidence = "medium";
haldirams.webMatchBasis = "Exact brand, product and 200 g pack; online recipe details remain provisional.";
haldirams.rating = { score: 4, dimension: "ingredients", label: "Ingredients", basis: "Palm oil and a wheat allergen need attention.", evidenceIds: ["he2"], experimental: true };
haldirams.profile = [{ label: "VEG MARK", evidenceIds: ["he1"] }, { label: "PALM OIL", evidenceIds: ["he2"] }, { label: "WHEAT ALLERGEN", evidenceIds: ["he2"] }];
haldirams.summary = "Check wheat allergen and palm oil.";
haldirams.findings = [
  { id: "h1", kind: "ingredient", level: "attention", title: "ALLERGEN: WHEAT", explanation: "Online 200 g listing says hing contains wheat.", evidenceIds: ["he2"], ruleIds: [], experimental: false },
  { id: "h2", kind: "ingredient", level: "attention", title: "CONTAINS PALM OIL", explanation: "Online 200 g listing names palm olein.", evidenceIds: ["he2"], ruleIds: [], experimental: false },
];
haldirams.claimAudits = [
  { claimAsPrinted: "Extruded Snack of Bengal Gram Flour with Pinch of Clove.", assessment: "Matched ingredients include chickpea flour and clove powder.", evidenceIds: ["he1", "he2"], status: "partially_supported" },
  { claimAsPrinted: "PRODUCT OF INDIA", assessment: "Origin cannot be independently established from this front image.", evidenceIds: ["he1"], status: "not_assessable" },
];
haldirams.evidence = [
  { id: "he1", origin: "package", excerptOrObservation: "Front shows 200 g net quantity and a green vegetarian mark.", citationId: null, visibleOnPackage: true },
  { id: "he2", origin: "hosted_web_search", excerptOrObservation: "Exact 200 g listing names palm olein and hing powder containing wheat.", citationId: "hc1", visibleOnPackage: false },
];
haldirams.citations = [{ id: "hc1", title: "Haldiram Ratlami Sev 200 g listing", url: "https://shop.ambikajapan.com/products/haldiram-ratlami-sev-200g", providerSourceId: "https://shop.ambikajapan.com/products/haldiram-ratlami-sev-200g" }];
haldirams.needsClearerImage = false;
haldirams.retakeGuidance = null;

const bread = baseItem(1, "Fibre Up", "food");
bread.identity = { nameAsPrinted: "Fibre Up", brandAsPrinted: "English Oven", variantAsPrinted: "For a Happy Gut", gtin: "8906001387114", confidence: "high" };
bread.printedVegMark = "veg";
bread.rating = { score: 6, dimension: "nutrition", label: "Nutrition", basis: "High fibre, with notable sodium and multiple allergens.", evidenceIds: ["be1", "be2"], experimental: true };
bread.profile = [{ label: "VEG MARK", evidenceIds: ["be3"] }, { label: "HIGH FIBRE", evidenceIds: ["be2"] }, { label: "MULTIPLE ALLERGENS", evidenceIds: ["be1"] }];
bread.ingredientTokens = ["whole wheat flour", "oats", "soy flour", "sesame seeds", "wheat gluten", "sugar"];
bread.nutrition = { basis: "per_100g", servingSize: 55, netQuantity: 400,
  values: { addedSugarsG: 1.93, saturatedFatG: 1.1, sodiumMg: 435, totalFatG: 3.09 },
  printedPerServeRdaPct: { addedSugars: 2, saturatedFat: 2.8, sodium: 12, totalFat: 3 } };
bread.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1"], limitations: [] };
bread.findings = [{ id: "b1", kind: "ingredient", level: "attention", title: "Allergens printed", explanation: "The pack declares wheat, oats, soy and sesame.", evidenceIds: ["be1"], ruleIds: ["in.fssai.labelling-display-2020.v1"], experimental: false }];
bread.claimAudits = [
  { claimAsPrinted: "FIBRE-UP", assessment: "The nutrition panel lists 10.27 g dietary fibre per 100 g.", evidenceIds: ["be2"], status: "supported" },
  { claimAsPrinted: "FOR A HAPPY GUT", assessment: "The package image cannot establish the claimed digestive effect.", evidenceIds: ["be2"], status: "not_assessable" },
  { claimAsPrinted: "3x DAILY FIBRE NEED", assessment: "The visible panel does not establish the claim's complete reference basis.", evidenceIds: ["be2"], status: "not_established" },
  { claimAsPrinted: "Source of Protein", assessment: "Protein is printed, but the regulatory claim conditions were not assessed.", evidenceIds: ["be2"], status: "partially_supported" },
];
bread.evidence = [
  { id: "be1", origin: "package", excerptOrObservation: "Allergen declaration states wheat, oats, soy and sesame seeds.", citationId: null, visibleOnPackage: true },
  { id: "be2", origin: "package", excerptOrObservation: "Nutrition panel lists 10.27 g dietary fibre per 100 g and 435 mg sodium.", citationId: null, visibleOnPackage: true },
  { id: "be3", origin: "package", excerptOrObservation: "Green vegetarian mark is printed on the pack.", citationId: null, visibleOnPackage: true },
];

const cartNames = ["Fruit Drink", "Breakfast Cereal", "Face Wash", "Dishwash Gel", "Baby Lotion", "Pet Treats"];
const cartCategories: ProductAnalysis["category"][] = ["beverage", "food", "personal_care", "household", "baby_care", "pet_care"];
const cart = cartNames.map((name, index) => baseItem(index + 1, name, cartCategories[index]));

export const DEMO_RESULTS: Record<string, AnalysisResult> = {
  haldirams: result([haldirams], "A front-only Haldiram’s pack triggers a provisional official-source lookup."),
  bread: result([bread], "A real bread label supports whole-pack and allergen checks."),
  cart: result(cart, "Six products identified from one shopping-cart image.", false),
};

export const DEMO_LABELS = [
  { id: "haldirams", label: "Front-only search", detail: "Real pack · online indicators", imageSrc: "/demo/haldirams-ratlami-sev.jpeg" },
  { id: "bread", label: "Whole-pack reality", detail: "Real pack · allergens", imageSrc: "/demo/english-oven-fibre-up.jpeg" },
  { id: "cart", label: "Six products", detail: "Synthetic until photo supplied", imageSrc: null },
] as const;
