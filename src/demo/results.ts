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

const cartBread = baseItem(1, "The Health Factory Zero Maida Whole Wheat Bread", "food");
cartBread.identity = { nameAsPrinted: "The Health Factory Zero Maida Whole Wheat Bread", brandAsPrinted: "The Health Factory", variantAsPrinted: "Zero Maida Whole Wheat Bread", gtin: null, confidence: "high" };
cartBread.nutrition = { source: "hosted_web_search", evidenceIds: ["e2"], basis: "per_100g", servingSize: null, netQuantity: 250,
  values: { addedSugarsG: 1.94, saturatedFatG: null, sodiumMg: null, totalFatG: null },
  printedPerServeRdaPct: { addedSugars: null, saturatedFat: null, sodium: null, totalFat: null } };
cartBread.claimsAsPrinted = ["Zero Maida", "Whole Wheat"];
cartBread.webMatchConfidence = "high";
cartBread.webMatchBasis = "Exact brand, variant and 250 g Indian listing; official product page.";
cartBread.profile = [{ label: "WHOLE WHEAT", evidenceIds: ["e1"] }, { label: "ALLERGENS", evidenceIds: ["e3"] }, { label: "SOURCE OF FIBRE", evidenceIds: ["e2"] }];
cartBread.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1", "in.fssai.advertising-claims-2018.v1"], limitations: ["Back-panel declarations are not readable in this cart image.", "Online recipe information can change; check the pack before eating."] };
cartBread.summary = "Contains wheat/gluten; official listing supports whole-wheat, no-maida recipe and fibre.";
cartBread.findings = [
  { id: "f1", kind: "ingredient", topic: "allergen", level: "attention", title: "ALLERGEN: WHEAT", explanation: "Contains wheat and gluten · avoid wheat/gluten allergy groups.", evidenceIds: ["e3"], ruleIds: [], experimental: false },
  { id: "f2", kind: "nutrition", topic: "added_sugars", level: "information", title: "LOW ADDED SUGAR", explanation: "1.94 g per 100 g.", evidenceIds: ["e2"], ruleIds: [], experimental: false },
];
cartBread.claimAudits = [
  { claimAsPrinted: "Zero Maida", assessment: "Official ingredient description says whole-wheat flour is the sole grain ingredient.", evidenceIds: ["e1"], status: "supported" },
  { claimAsPrinted: "Whole Wheat", assessment: "Official ingredient description identifies chakki atta/whole-wheat flour.", evidenceIds: ["e1"], status: "supported" },
];
cartBread.evidence = [
  { id: "e1", origin: "hosted_web_search", excerptOrObservation: "Official page: chakki atta is the sole grain ingredient; no maida.", citationId: "c1", visibleOnPackage: false },
  { id: "e2", origin: "hosted_web_search", excerptOrObservation: "Official page reports 1.94 g added sugar per 100 g and 15.78 g fibre per 250 g pack.", citationId: "c1", visibleOnPackage: false },
  { id: "e3", origin: "hosted_web_search", excerptOrObservation: "Official allergen statement: contains wheat and gluten; facility also processes nuts, soy and milk.", citationId: "c1", visibleOnPackage: false },
];
cartBread.citations = [{ id: "c1", title: "The Health Factory Zero Maida Bread Whole Wheat 250g", url: "https://www.thehealthfactory.in/products/zero-maida-simply-whole-wheat?variant=40875412390097", providerSourceId: "https://www.thehealthfactory.in/products/zero-maida-simply-whole-wheat?variant=40875412390097&utm_source=openai" }];

const cartCocoa = baseItem(2, "The Whole Truth Hazelnut 47% Cocoa Bar", "food");
cartCocoa.identity = { nameAsPrinted: "The Whole Truth Hazelnut 47% Cocoa Bar", brandAsPrinted: "The Whole Truth", variantAsPrinted: "Hazelnut 47% Cocoa Bar", gtin: null, confidence: "high" };
cartCocoa.claimsAsPrinted = ["47% Cocoa"];
cartCocoa.printedVegMark = "veg";
cartCocoa.webMatchConfidence = "high";
cartCocoa.webMatchBasis = "Exact brand, Hazelnut 47% Cocoa variant and 80 g Indian listing.";
cartCocoa.profile = [{ label: "HAZELNUTS", evidenceIds: ["e5"] }, { label: "DATE-SWEETENED", evidenceIds: ["e5"] }, { label: "THREE INGREDIENTS", evidenceIds: ["e5"] }];
cartCocoa.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1", "in.fssai.advertising-claims-2018.v1"], limitations: ["Back-panel nutrition and allergen statement are not readable in this cart image."] };
cartCocoa.summary = "Contains hazelnuts; online listing shows dates as the sweetener and a three-ingredient recipe.";
cartCocoa.findings = [
  { id: "f3", kind: "ingredient", topic: "allergen", level: "attention", title: "ALLERGEN: HAZELNUT", explanation: "15% roasted hazelnuts · avoid tree-nut allergy groups.", evidenceIds: ["e5"], ruleIds: [], experimental: false },
  { id: "f4", kind: "ingredient", topic: "ingredient", level: "information", title: "DATE-SWEETENED", explanation: "Online listing: 38% date powder; no refined sweetener listed.", evidenceIds: ["e5"], ruleIds: [], experimental: false },
];
cartCocoa.claimAudits = [{ claimAsPrinted: "47% Cocoa", assessment: "Exact 80 g listing specifies cocoa at 47%.", evidenceIds: ["e5"], status: "supported" }];
cartCocoa.evidence = [
  { id: "e4", origin: "package", excerptOrObservation: "Cart text shows The Whole Truth Hazelnut 47% Cocoa Bar, 80 g.", citationId: null, visibleOnPackage: true },
  { id: "e5", origin: "hosted_web_search", excerptOrObservation: "Exact listing: cocoa 47%, date powder 38%, roasted hazelnuts 15%.", citationId: "c2", visibleOnPackage: false },
];
cartCocoa.citations = [{ id: "c2", title: "The Whole Truth Hazelnut Dark Cocoa Bar, 80 g", url: "https://www.swiggy.com/instamart/p/the-whole-truth-dark-cocoa-bar-hazelnut-sweetened-with-dates-XHD3H6ZUPU", providerSourceId: "https://www.swiggy.com/instamart/p/the-whole-truth-dark-cocoa-bar-hazelnut-sweetened-with-dates-XHD3H6ZUPU?utm_source=openai" }];

const cartBiscuit = baseItem(3, "Patanjali Whole Wheat Nariyal Biscuit", "food");
cartBiscuit.identity = { nameAsPrinted: "Patanjali Whole Wheat Nariyal Biscuit", brandAsPrinted: "Patanjali", variantAsPrinted: "Whole Wheat Nariyal Biscuit", gtin: null, confidence: "high" };
cartBiscuit.nutrition = { source: "hosted_web_search", evidenceIds: ["e7"], basis: "per_100g", servingSize: 14, netQuantity: 204,
  values: { addedSugarsG: null, saturatedFatG: 9.5, sodiumMg: null, totalFatG: 21 },
  printedPerServeRdaPct: { addedSugars: null, saturatedFat: null, sodium: null, totalFat: null } };
cartBiscuit.claimsAsPrinted = ["Whole Wheat"];
cartBiscuit.printedVegMark = "veg";
cartBiscuit.webMatchConfidence = "high";
cartBiscuit.webMatchBasis = "Exact Patanjali page includes the 204 g option; official nutrition page matches the named product.";
cartBiscuit.profile = [{ label: "PALM OIL", evidenceIds: ["e6"] }, { label: "ALLERGENS", evidenceIds: ["e6"] }, { label: "WHOLE WHEAT", evidenceIds: ["e7"] }];
cartBiscuit.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1", "in.fssai.advertising-claims-2018.v1"], limitations: ["Back-panel declarations are not readable in this cart image.", "Nutrition page does not confirm this exact pack's current recipe."] };
cartBiscuit.summary = "Palm oil and milk listed; 9.5 g saturated fat and 19 g cane sugar per 100 g.";
cartBiscuit.findings = [
  { id: "f5", kind: "ingredient", topic: "palm_oil", level: "attention", title: "CONTAINS PALM OIL", explanation: "Refined palm oil listed in the exact product range.", evidenceIds: ["e6"], ruleIds: [], experimental: false },
  { id: "f6", kind: "nutrition", topic: "saturated_fat", level: "attention", title: "HIGH SATURATED FAT", explanation: "9.5 g per 100 g.", evidenceIds: ["e7"], ruleIds: [], experimental: false },
  { id: "f7", kind: "nutrition", topic: "total_sugars", level: "attention", title: "HIGH SUGAR", explanation: "19 g cane sugar per 100 g.", evidenceIds: ["e7"], ruleIds: [], experimental: false },
  { id: "f8", kind: "ingredient", topic: "allergen", level: "attention", title: "ALLERGEN: WHEAT, MILK", explanation: "Wheat flour and milk solids listed.", evidenceIds: ["e6"], ruleIds: [], experimental: false },
];
cartBiscuit.claimAudits = [{ claimAsPrinted: "Whole Wheat", assessment: "Official nutrition page describes the product as made from whole wheat atta.", evidenceIds: ["e7"], status: "supported" }];
cartBiscuit.evidence = [
  { id: "e6", origin: "hosted_web_search", excerptOrObservation: "Patanjali listing ingredients include wheat flour, refined palm oil and milk solids.", citationId: "c3", visibleOnPackage: false },
  { id: "e7", origin: "hosted_web_search", excerptOrObservation: "Official page: per 100 g fat 21 g, saturated fatty acids 9.5 g, cane sugar 19 g; serving size 14 g.", citationId: "c4", visibleOnPackage: false },
];
cartBiscuit.citations = [
  { id: "c3", title: "Patanjali Nariyal Biscuits product listing", url: "https://www.patanjaliayurved.net/product/natural-food-products/biscuits-and-cookies/patanjali-nariyal-biscuits/6909", providerSourceId: "https://www.patanjaliayurved.net/product/natural-food-products/biscuits-and-cookies/patanjali-nariyal-biscuits/6909?utm_source=openai" },
  { id: "c4", title: "Patanjali Ayurved Nariyal Biscuits", url: "https://patanjaliayurved.org/product/nariyal-biscuits/", providerSourceId: "https://patanjaliayurved.org/product/nariyal-biscuits/?utm_source=openai" },
];

const cartKurkure = baseItem(4, "Kurkure Masala Munch Crisps", "food");
cartKurkure.identity = { nameAsPrinted: "Kurkure Masala Munch Crisps", brandAsPrinted: "Kurkure", variantAsPrinted: "Masala Munch Crisps", gtin: null, confidence: "high" };
cartKurkure.webMatchConfidence = "medium";
cartKurkure.webMatchBasis = "Exact brand, product and 75 g pack; current retailer listing lacks oil type and nutrition values.";
cartKurkure.profile = [{ label: "ADDED COLOUR", evidenceIds: ["e9"] }, { label: "FLAVOURINGS", evidenceIds: ["e9"] }, { label: "SOURCE UNCLEAR", evidenceIds: ["e10"] }];
cartKurkure.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1"], limitations: ["Current exact listing does not provide a usable nutrition panel.", "Oil type differs across online sources; confirm the packet ingredient panel."] };
cartKurkure.summary = "Seasoning includes sugar, flavourings, colour and acidity regulators; current oil type and nutrition are unclear.";
cartKurkure.findings = [
  { id: "f9", kind: "ingredient", topic: "colours", level: "information", title: "ADDED COLOUR", explanation: "Colour INS 160c listed in the exact 75 g retailer listing.", evidenceIds: ["e9"], ruleIds: [], experimental: false },
  { id: "f10", kind: "ingredient", topic: "ingredient", level: "information", title: "FLAVOURINGS LISTED", explanation: "Natural and nature-identical flavouring substances listed.", evidenceIds: ["e9"], ruleIds: [], experimental: false },
];
cartKurkure.evidence = [
  { id: "e8", origin: "package", excerptOrObservation: "Cart text shows Kurkure Masala Munch Crisps, 75 g.", citationId: null, visibleOnPackage: true },
  { id: "e9", origin: "hosted_web_search", excerptOrObservation: "Exact 75 g listing includes seasoning with sugar, flavours, acidity regulators 330/296/334 and colour 160c.", citationId: "c5", visibleOnPackage: false },
  { id: "e10", origin: "hosted_web_search", excerptOrObservation: "An older source names palmolein, while the current exact listing says only edible vegetable oil; oil type is uncertain.", citationId: "c6", visibleOnPackage: false },
];
cartKurkure.citations = [
  { id: "c5", title: "Zepto Kurkure Namkeen Masala Munch, 75 g", url: "https://www.zepto.com/pn/kurkure-masala-munch/pvid/c32d9425-0bdb-4d31-bb21-47630f1811f9", providerSourceId: "https://www.zepto.com/pn/kurkure-masala-munch/pvid/c32d9425-0bdb-4d31-bb21-47630f1811f9?utm_source=openai" },
  { id: "c6", title: "Kurkure Masala Munch 75 g product page", url: "https://www.indianonlinestore.de/product-page/kurkure-masala-munch-75-g", providerSourceId: "https://www.indianonlinestore.de/product-page/kurkure-masala-munch-75-g?utm_source=openai" },
];

const cartBalaji = baseItem(5, "Balaji Crunchem Cream & Onion Wafers", "food");
cartBalaji.identity = { nameAsPrinted: "Balaji Crunchem Cream & Onion Wafers", brandAsPrinted: "Balaji", variantAsPrinted: "Crunchem Cream & Onion Wafers", gtin: null, confidence: "high" };
cartBalaji.nutrition = { source: "hosted_web_search", evidenceIds: ["e12"], basis: "per_100g", servingSize: 30, netQuantity: 140,
  values: { addedSugarsG: 3.1, saturatedFatG: 15.6, sodiumMg: 524, totalFatG: 32.8 },
  printedPerServeRdaPct: { addedSugars: 2, saturatedFat: 21, sodium: 8, totalFat: 15 } };
cartBalaji.printedVegMark = "veg";
cartBalaji.webMatchConfidence = "high";
cartBalaji.webMatchBasis = "Official Balaji page exactly matches Cream & Onion Wafers, 140 g.";
cartBalaji.profile = [{ label: "PALM OIL", evidenceIds: ["e11"] }, { label: "ALLERGENS", evidenceIds: ["e11"] }, { label: "HIGH SATURATED FAT", evidenceIds: ["e12"] }, { label: "HIGH FAT", evidenceIds: ["e12"] }];
cartBalaji.coverage = { tier: "category_rules", rulePackIds: ["in.fssai.labelling-display-2020.v1"], limitations: ["Nutrition is from the official online panel, not readable on this cart image."] };
cartBalaji.summary = "High saturated fat; contains palmolein, milk and soy. Fibre is 5.7 g per 100 g.";
cartBalaji.findings = [
  { id: "f11", kind: "nutrition", topic: "saturated_fat", level: "attention", title: "HIGH SATURATED FAT", explanation: "4.68 g per pack serving · 21% daily value.", evidenceIds: ["e12"], ruleIds: [], experimental: false },
  { id: "f12", kind: "nutrition", topic: "total_fat", level: "attention", title: "HIGH TOTAL FAT", explanation: "9.84 g per pack serving · 15% daily value.", evidenceIds: ["e12"], ruleIds: [], experimental: false },
  { id: "f13", kind: "ingredient", topic: "palm_oil", level: "attention", title: "CONTAINS PALM OIL", explanation: "Palmolein is the listed edible vegetable oil.", evidenceIds: ["e11"], ruleIds: [], experimental: false },
  { id: "f14", kind: "ingredient", topic: "allergen", level: "attention", title: "ALLERGEN: MILK, SOY", explanation: "Whey, cheese powder and hydrolysed soya listed.", evidenceIds: ["e11"], ruleIds: [], experimental: false },
  { id: "f15", kind: "nutrition", topic: "nutrition", level: "information", title: "DIETARY FIBRE", explanation: "5.7 g per 100 g.", evidenceIds: ["e12"], ruleIds: [], experimental: false },
];
cartBalaji.evidence = [
  { id: "e11", origin: "hosted_web_search", excerptOrObservation: "Official ingredients: potato 88%, palmolein, whey, cheese powder and hydrolysed vegetable powder (soya).", citationId: "c7", visibleOnPackage: false },
  { id: "e12", origin: "hosted_web_search", excerptOrObservation: "Official per 100 g panel: total fat 32.8 g, saturated fat 15.6 g, sodium 524 mg, added sugars 3.1 g; per-30 g RDA percentages shown.", citationId: "c7", visibleOnPackage: false },
];
cartBalaji.citations = [{ id: "c7", title: "Balaji Crunchem Cream & Onion Wafers, 140 g", url: "https://www.balajiwafers.com/products/crunchem-cream-onion-wafers", providerSourceId: "https://www.balajiwafers.com/products/crunchem-cream-onion-wafers?utm_source=openai" }];

export const DEMO_RESULTS: Record<string, AnalysisResult> = {
  alofrut: result([alofrut], "A 300 ml beverage demonstrates printed and whole-bottle RDA, ingredients and claim review."),
  haldirams: result([haldirams], "A front-only Haldiram’s pack triggers a provisional official-source lookup."),
  bread: result([bread], "A real bread label supports whole-pack and allergen checks."),
  cart: result([cartBread, cartCocoa, cartBiscuit, cartKurkure, cartBalaji], "Five cart items analysed: bread, cocoa bar, biscuits and two savoury snacks."),
};

export const DEMO_LABELS = [
  { id: "alofrut", label: "Sugar + RDA", detail: "Real pack · claims + additives", imageSrc: "/demo/alofrut-annar-aloevera.jpeg" },
  { id: "bread", label: "Whole-pack reality", detail: "Real pack · RDA + allergens", imageSrc: "/demo/english-oven-fibre-up.jpeg" },
  { id: "haldirams", label: "Front-only search", detail: "Real pack · online evidence", imageSrc: "/demo/haldirams-ratlami-sev.jpeg" },
  { id: "cart", label: "Five-item cart", detail: "User cart · cached result", imageSrc: "/demo/cart-five-items.jpeg" },
] as const;
