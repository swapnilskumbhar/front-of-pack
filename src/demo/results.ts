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

const gridQuaker = baseItem(1, "Rolled Oats", "food");
gridQuaker.identity = { nameAsPrinted: "Rolled Oats", brandAsPrinted: "Quaker", variantAsPrinted: null, gtin: null, confidence: "high" };
gridQuaker.nutrition = { source: "hosted_web_search", evidenceIds: ["gq2"], basis: "per_100g", servingSize: null, netQuantity: 1000,
  values: { addedSugarsG: null, saturatedFatG: 1.3, sodiumMg: 4.9, totalFatG: 8.5 },
  printedPerServeRdaPct: { addedSugars: null, saturatedFat: null, sodium: null, totalFat: null } };
gridQuaker.webMatchConfidence = "medium";
gridQuaker.webMatchBasis = "Exact Quaker rolled-oats listing and 1 kg pouch; front image does not confirm the full variant wording.";
gridQuaker.profile = [{ label: "LOW SODIUM", evidenceIds: ["gq2"] }, { label: "LOW SATURATED FAT", evidenceIds: ["gq2"] }, { label: "SOURCE UNCLEAR", evidenceIds: ["gq1"] }];
gridQuaker.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1", "in.legal-metrology.packaged-commodities-2011.v1"], limitations: ["Back-panel ingredient and date declarations are not visible.", "Online listing may not reflect every batch."] };
gridQuaker.summary = "Low sodium and saturated fat online; confirm the back label for exact ingredients.";
gridQuaker.findings = [
  { id: "gqf1", kind: "nutrition", topic: "sodium", level: "information", title: "LOW SODIUM", explanation: "4.9 mg per 100 g · online listing.", evidenceIds: ["gq2"], ruleIds: [], experimental: false },
  { id: "gqf2", kind: "nutrition", topic: "saturated_fat", level: "information", title: "LOW SATURATED FAT", explanation: "1.3 g per 100 g · online listing.", evidenceIds: ["gq2"], ruleIds: [], experimental: false },
];
gridQuaker.evidence = [
  { id: "gq1", origin: "package", excerptOrObservation: "Listing visibly identifies Quaker Rolled Oats in a 1 kg pouch.", citationId: null, visibleOnPackage: true },
  { id: "gq2", origin: "hosted_web_search", excerptOrObservation: "Matched 1 kg listing reports per 100 g: 8.5 g total fat, 1.3 g saturated fat and 4.9 mg sodium.", citationId: "gqc1", visibleOnPackage: false },
];
gridQuaker.citations = [{ id: "gqc1", title: "Quaker Natural Wholegrain Rolled Oats — Zepto", url: "https://www.zepto.com/pn/quaker-natural-wholegrain-rolled-oats/pvid/25065907-7921-4fb2-b44b-d7e5cf5c227e", providerSourceId: "https://www.zepto.com/pn/quaker-natural-wholegrain-rolled-oats/pvid/25065907-7921-4fb2-b44b-d7e5cf5c227e?utm_source=openai" }];

const gridMuesli = baseItem(2, "Fruit, Nut & Seeds Muesli 12 in 1 Power Breakfast", "food");
gridMuesli.identity = { nameAsPrinted: "Fruit, Nut & Seeds Muesli 12 in 1 Power Breakfast", brandAsPrinted: "Kellogg's", variantAsPrinted: null, gtin: null, confidence: "high" };
gridMuesli.claimsAsPrinted = ["12 in 1 POWER BREAKFAST"];
gridMuesli.webMatchConfidence = "high";
gridMuesli.webMatchBasis = "Exact Kellogg’s Fruit, Nut & Seeds Muesli, 750 g Indian pack matched.";
gridMuesli.profile = [{ label: "ALLERGENS", evidenceIds: ["gm4"] }, { label: "NO PALM OIL", evidenceIds: ["gm3"] }, { label: "NO ADDED PRESERVATIVES", evidenceIds: ["gm3"] }, { label: "MULTIGRAIN", evidenceIds: ["gm4"] }];
gridMuesli.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1", "in.fssai.advertising-claims-2018.v1", "in.legal-metrology.packaged-commodities-2011.v1"], limitations: ["Nutrition panel and batch-specific details are not visible in the image."] };
gridMuesli.summary = "Contains multiple allergens; matched official recipe says no palm oil or added preservatives.";
gridMuesli.findings = [
  { id: "gmf1", kind: "ingredient", topic: "allergen", level: "attention", title: "ALLERGEN: WHEAT, NUTS", explanation: "Wheat, barley, oats, almonds and sulphite · avoid if allergic.", evidenceIds: ["gm4"], ruleIds: [], experimental: false },
  { id: "gmf2", kind: "ingredient", topic: "palm_oil", level: "information", title: "NO PALM OIL", explanation: "Matched official product page says made without palm oil.", evidenceIds: ["gm3"], ruleIds: [], experimental: false },
  { id: "gmf3", kind: "ingredient", topic: "preservatives", level: "information", title: "NO ADDED PRESERVATIVES", explanation: "Matched official product page says made without added preservatives.", evidenceIds: ["gm3"], ruleIds: [], experimental: false },
];
gridMuesli.claimAudits = [{ claimAsPrinted: "12 in 1 POWER BREAKFAST", assessment: "Official product page describes 12-in-1 fruits, nuts, seeds and grains.", evidenceIds: ["gm3", "gm4"], status: "supported" }];
gridMuesli.evidence = [
  { id: "gm1", origin: "package", excerptOrObservation: "Listing visibly identifies Kellogg’s Fruit, Nut & Seeds Muesli, 750 g.", citationId: null, visibleOnPackage: true },
  { id: "gm2", origin: "package", excerptOrObservation: "Front pack visibly prints “12 in 1 POWER BREAKFAST.”", citationId: null, visibleOnPackage: true },
  { id: "gm3", origin: "hosted_web_search", excerptOrObservation: "Official page describes a 12-in-1 mix made without palm oil and added preservatives.", citationId: "gmc1", visibleOnPackage: false },
  { id: "gm4", origin: "hosted_web_search", excerptOrObservation: "Official ingredient/allergen statement lists wheat, barley, oats, almonds and sulphite; may contain other nuts, soy and milk.", citationId: "gmc1", visibleOnPackage: false },
];
gridMuesli.citations = [{ id: "gmc1", title: "Kellogg’s Muesli Fruit, Nut & Seeds — official India product page", url: "https://www.kelloggs.com/en-in/products/muesli/kelloggs-muesli-fruit-nuts-seeds.html", providerSourceId: "https://www.kelloggs.com/en-in/products/muesli/kelloggs-muesli-fruit-nuts-seeds.html" }];

const gridCornFlakes = baseItem(3, "Corn Flakes Original Power Breakfast 7 Vitamins", "food");
gridCornFlakes.identity = { nameAsPrinted: "Corn Flakes Original Power Breakfast 7 Vitamins", brandAsPrinted: "Kellogg's", variantAsPrinted: null, gtin: null, confidence: "high" };
gridCornFlakes.claimsAsPrinted = ["POWER BREAKFAST", "7 VITAMINS", "1% FAT"];
gridCornFlakes.webMatchConfidence = "high";
gridCornFlakes.webMatchBasis = "Exact Indian product line and 1.15 kg listing matched; official page lists the closely corresponding 1.2 kg size.";
gridCornFlakes.profile = [{ label: "ALLERGENS", evidenceIds: ["gc4"] }, { label: "LOW FAT", evidenceIds: ["gc3"] }, { label: "ADDED SUGAR", evidenceIds: ["gc4"] }, { label: "FORTIFIED", evidenceIds: ["gc3"] }];
gridCornFlakes.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1", "in.fssai.advertising-claims-2018.v1", "in.legal-metrology.packaged-commodities-2011.v1"], limitations: ["Back-panel nutrition and ingredient declarations are not visible in the image.", "The official size is 1.2 kg, while the listing shows 1.15 kg."] };
gridCornFlakes.summary = "Contains wheat and barley; low-fat claim is supported, but recipe includes sugar.";
gridCornFlakes.findings = [
  { id: "gcf1", kind: "ingredient", topic: "allergen", level: "attention", title: "ALLERGEN: WHEAT, BARLEY", explanation: "Official allergen statement lists wheat and barley · avoid if allergic.", evidenceIds: ["gc4"], ruleIds: [], experimental: false },
  { id: "gcf2", kind: "ingredient", topic: "added_sugars", level: "information", title: "CONTAINS SUGAR", explanation: "Sugar appears in the matched official ingredient list.", evidenceIds: ["gc4"], ruleIds: [], experimental: false },
  { id: "gcf3", kind: "nutrition", topic: "total_fat", level: "information", title: "LOW FAT", explanation: "1% fat · matched official product statement.", evidenceIds: ["gc3"], ruleIds: [], experimental: false },
];
gridCornFlakes.claimAudits = [
  { claimAsPrinted: "POWER BREAKFAST", assessment: "Marketing wording; no quantitative performance outcome is established.", evidenceIds: ["gc1"], status: "not_assessable" },
  { claimAsPrinted: "7 VITAMINS", assessment: "Official page states enrichment with seven essential vitamins.", evidenceIds: ["gc3"], status: "supported" },
  { claimAsPrinted: "1% FAT", assessment: "Official page states the product has only 1% fat.", evidenceIds: ["gc3"], status: "supported" },
];
gridCornFlakes.evidence = [
  { id: "gc1", origin: "package", excerptOrObservation: "Listing visibly identifies Kellogg’s Corn Flakes Original Power Breakfast 7 Vitamins, 1.15 kg.", citationId: null, visibleOnPackage: true },
  { id: "gc2", origin: "package", excerptOrObservation: "Front pack visibly prints “POWER BREAKFAST,” “7 VITAMINS” and “1% FAT.”", citationId: null, visibleOnPackage: true },
  { id: "gc3", origin: "hosted_web_search", excerptOrObservation: "Official page states enrichment with seven essential vitamins and only 1% fat.", citationId: "gcc1", visibleOnPackage: false },
  { id: "gc4", origin: "hosted_web_search", excerptOrObservation: "Official recipe includes sugar; its allergen statement lists wheat and barley.", citationId: "gcc1", visibleOnPackage: false },
];
gridCornFlakes.citations = [{ id: "gcc1", title: "Kellogg’s Corn Flakes Original — official India product page", url: "https://www.kelloggs.com/content/Asia/kelloggs_in/en-in/products/corn-flakes-original-and-the-best-cereal.html", providerSourceId: "https://www.kelloggs.com/content/Asia/kelloggs_in/en-in/products/corn-flakes-original-and-the-best-cereal.html?utm_source=openai" }];

export const DEMO_RESULTS: Record<string, AnalysisResult> = {
  alofrut: result([alofrut], "A 300 ml beverage demonstrates printed and whole-bottle RDA, ingredients and claim review."),
  haldirams: result([haldirams], "A front-only Haldiram’s pack triggers a provisional official-source lookup."),
  bread: result([bread], "A real bread label supports whole-pack and allergen checks."),
  grid: result([gridQuaker, gridMuesli, gridCornFlakes], "Store listing shows three identifiable breakfast cereals; back labels are not visible."),
};

export const DEMO_LABELS = [
  { id: "alofrut", label: "Sugar + RDA", detail: "Real pack · claims + additives", imageSrc: "/demo/alofrut-annar-aloevera.jpeg" },
  { id: "bread", label: "Whole-pack reality", detail: "Real pack · RDA + allergens", imageSrc: "/demo/english-oven-fibre-up.jpeg" },
  { id: "haldirams", label: "Front-only search", detail: "Real pack · online evidence", imageSrc: "/demo/haldirams-ratlami-sev.jpeg" },
  { id: "grid", label: "Three products", detail: "Public grocery grid · cached result", imageSrc: "/demo/bigbasket-breakfast-grid.png" },
] as const;
