import type { AnalysisResult, ProductAnalysis } from "../domain/analysis.ts";
import { attachDecisions } from "../engine/index.ts";

const baseItem = (position: number, name: string, category: ProductAnalysis["category"]): ProductAnalysis => ({
  position,
  identity: { nameAsPrinted: name, brandAsPrinted: "Demo Pack", variantAsPrinted: null, gtin: null, confidence: "high" },
  category, nutrition: null, ingredientTokens: [], claimsAsPrinted: [],
  profile: [],
  coverage: { tier: category === "food" || category === "beverage" ? "category_rules" : "general_pack_rules", rulePackIds: [], limitations: [] },
  summary: name, findings: [], claimAudits: [], evidence: [], citations: [], serviceRoute: null,
  needsClearerImage: false, retakeGuidance: null,
});

function result(items: ProductAnalysis[], summary: string, real = true): AnalysisResult {
  return attachDecisions({ schemaVersion: "analysis-result.v3", language: "en", analyzedCount: items.length,
    unknownCount: items.filter((item) => item.identity.confidence === "unknown").length,
    flaggedCount: items.filter((item) => item.findings.some((finding) => finding.level === "attention")).length,
    truncated: false, wholeImageSummary: summary,
    strongestMaterialFinding: items.flatMap((item) => item.findings).find((finding) => finding.level === "attention")?.explanation ?? null,
    items, disclaimer: real
      ? "Cached result reconstructed from a real Front of Pack analysis run on 24 August 2026."
      : "Cached demonstration from a fixed synthetic multi-product fixture." });
}

const alofrut = baseItem(1, "Alofrut Annar Aloevera Juice", "beverage");
alofrut.identity = { nameAsPrinted: "Alofrut Annar Aloevera Juice", brandAsPrinted: "Alofrut", variantAsPrinted: "Fusion of health and taste", gtin: null, confidence: "high" };
alofrut.nutrition = { source: "package", evidenceIds: ["ae1"], basis: "per_100ml", servingSize: 150, netQuantity: 300,
  values: { addedSugarsG: 10.5, saturatedFatG: null, sodiumMg: 226, totalFatG: null },
  printedPerServeRdaPct: { addedSugars: 31.5, saturatedFat: null, sodium: 16.9, totalFat: null } };
alofrut.ingredientTokens = ["aloe vera pulp", "reconstituted pomegranate juice", "ins 211", "ins 202", "ins 110", "ins 122", "added sugar"];
alofrut.claimsAsPrinted = ["Fusion of health and taste"];
alofrut.profile = [
  { label: "HIGH ADDED SUGAR", evidenceIds: ["ae1"] }, { label: "SODIUM DECLARED", evidenceIds: ["ae1"] },
  { label: "PRESERVATIVES", evidenceIds: ["ae2"] }, { label: "ADDED COLOURS", evidenceIds: ["ae2"] },
  { label: "ALOE VERA 14%", evidenceIds: ["ae3"] },
];
alofrut.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1", "in.fssai.advertising-claims-2018.v1"], limitations: [] };
alofrut.summary = "High added sugar and notable sodium; preservatives and added colours are declared.";
alofrut.findings = [
  { id: "af1", kind: "nutrition", topic: "sodium", level: "attention", title: "SODIUM", explanation: "226 mg per 100 ml · 16.9% printed RDA per serving.", evidenceIds: ["ae1"], ruleIds: [], experimental: false },
  { id: "af2", kind: "ingredient", topic: "preservatives", level: "attention", title: "CONTAINS PRESERVATIVES", explanation: "INS 211 and INS 202 are printed in the ingredient list.", evidenceIds: ["ae2"], ruleIds: [], experimental: false },
  { id: "af3", kind: "ingredient", topic: "colours", level: "attention", title: "ADDED COLOURS", explanation: "INS 110 and INS 122 are printed in the ingredient list.", evidenceIds: ["ae2"], ruleIds: [], experimental: false },
  { id: "af4", kind: "ingredient", topic: "ingredient", level: "information", title: "LIMITED FRUIT CONTENT", explanation: "Aloe vera 14%; reconstituted pomegranate juice 10% printed.", evidenceIds: ["ae3"], ruleIds: [], experimental: false },
];
alofrut.claimAudits = [{ claimAsPrinted: "Fusion of health and taste", assessment: "No direct nutrition or composition basis establishes an overall health benefit; added sugar is declared.", evidenceIds: ["ae1", "ae4"], status: "not_established" }];
alofrut.evidence = [
  { id: "ae1", origin: "package", excerptOrObservation: "Per 100 ml: 10.5 g added sugar and 226 mg sodium; serving 150 ml; bottle 300 ml.", citationId: null, visibleOnPackage: true },
  { id: "ae2", origin: "package", excerptOrObservation: "Ingredients print preservatives INS 211/202 and colours INS 110/122.", citationId: null, visibleOnPackage: true },
  { id: "ae3", origin: "package", excerptOrObservation: "Aloe vera pulp 14% and reconstituted pomegranate juice 10% are printed.", citationId: null, visibleOnPackage: true },
  { id: "ae4", origin: "package", excerptOrObservation: "Front/back artwork states “Fusion of health and taste”.", citationId: null, visibleOnPackage: true },
];

const haldirams = baseItem(1, "RATLAMI SEV", "food");
haldirams.identity = { nameAsPrinted: "RATLAMI SEV", brandAsPrinted: "Haldiram’s", variantAsPrinted: null, gtin: null, confidence: "high" };
haldirams.printedVegMark = "veg";
haldirams.claimsAsPrinted = ["Extruded Snack of Bengal Gram Flour with Pinch of Clove.", "PRODUCT OF INDIA"];
haldirams.webMatchConfidence = "medium";
haldirams.webMatchBasis = "Exact brand, product and 200 g pack; online recipe details remain provisional.";
haldirams.profile = [{ label: "VEG MARK", evidenceIds: ["he1"] }, { label: "PALM OIL", evidenceIds: ["he2"] }, { label: "WHEAT ALLERGEN", evidenceIds: ["he2"] }];
haldirams.summary = "Check wheat allergen and palm oil.";
haldirams.findings = [
  { id: "h1", kind: "ingredient", topic: "allergen", level: "attention", title: "ALLERGEN: WHEAT", explanation: "Online 200 g listing says hing contains wheat.", evidenceIds: ["he2"], ruleIds: [], experimental: false },
  { id: "h2", kind: "ingredient", topic: "palm_oil", level: "attention", title: "CONTAINS PALM OIL", explanation: "Online 200 g listing names palm olein.", evidenceIds: ["he2"], ruleIds: [], experimental: false },
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
bread.claimsAsPrinted = ["FIBRE-UP", "FOR A HAPPY GUT", "3x DAILY FIBRE NEED", "Source of Protein"];
bread.profile = [{ label: "VEG MARK", evidenceIds: ["be3"] }, { label: "HIGH FIBRE", evidenceIds: ["be2"] }, { label: "MULTIPLE ALLERGENS", evidenceIds: ["be1"] }];
bread.ingredientTokens = ["whole wheat flour", "oats", "soy flour", "sesame seeds", "wheat gluten", "sugar"];
bread.nutrition = { source: "package", evidenceIds: ["be2"], basis: "per_100g", servingSize: 55, netQuantity: 400,
  values: { addedSugarsG: 1.93, saturatedFatG: 1.1, sodiumMg: 435, totalFatG: 3.09 },
  printedPerServeRdaPct: { addedSugars: 2, saturatedFat: 2.8, sodium: 12, totalFat: 3 } };
bread.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1"], limitations: [] };
bread.findings = [{ id: "b1", kind: "ingredient", topic: "allergen", level: "attention", title: "Allergens printed", explanation: "The pack declares wheat, oats, soy and sesame.", evidenceIds: ["be1"], ruleIds: ["in.fssai.labelling-display-2020.v1"], experimental: false }];
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
  alofrut: result([alofrut], "A 300 ml beverage demonstrates printed and whole-bottle RDA, ingredients and claim review."),
  haldirams: result([haldirams], "A front-only Haldiram’s pack triggers a provisional official-source lookup."),
  bread: result([bread], "A real bread label supports whole-pack and allergen checks."),
  cart: result(cart, "Six products identified from one shopping-cart image.", false),
};

export const DEMO_LABELS = [
  { id: "alofrut", label: "Sugar + RDA", detail: "Real pack · claims + additives", imageSrc: "/demo/alofrut-annar-aloevera.jpeg" },
  { id: "bread", label: "Whole-pack reality", detail: "Real pack · RDA + allergens", imageSrc: "/demo/english-oven-fibre-up.jpeg" },
  { id: "haldirams", label: "Front-only search", detail: "Real pack · online evidence", imageSrc: "/demo/haldirams-ratlami-sev.jpeg" },
  { id: "cart", label: "Six products", detail: "Synthetic until photo supplied", imageSrc: null },
] as const;
