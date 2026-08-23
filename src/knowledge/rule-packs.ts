import type { RulePack } from "./types.ts";

const ACCESSED_DATE = "2026-08-23";

export const RULE_PACKS = [
  {
    id: "in.fssai.labelling-display-2020.v1",
    version: 1,
    title: "FSSAI Labelling and Display Regulations, 2020",
    status: "official",
    categories: ["food", "beverage", "supplement"],
    coverageTier: "category_rules",
    machineContext:
      "For a pre-packaged food label, describe only clearly visible declarations relevant to the 2020 regulations, such as the food name, ingredient list, nutrition information, veg/non-veg declaration, allergen declaration, lot or batch identification, date marking, instructions where applicable, and FSSAI logo/licence number. Treat obscured or absent-in-image information as unknown; request another panel before discussing omission.",
    source: {
      publisher: "Food Safety and Standards Authority of India",
      title: "Food Safety and Standards (Labelling and Display) Regulations, 2020",
      url: "https://fssai.gov.in/notifications.php?pages=16",
      effectiveDate: "2022-07-01",
      accessedDate: ACCESSED_DATE,
    },
    limitations: [
      "An image review cannot establish product composition, laboratory quality, authenticity, or legal compliance.",
      "Product-specific standards and later amendments may add, remove, or modify requirements.",
      "A declaration not visible in the supplied image must not be described as absent from the complete package.",
      "Health supplements and special-purpose foods may require additional specialist regulations not encoded in this initial pack.",
    ],
  },
  {
    id: "in.legal-metrology.packaged-commodities-2011.v1",
    version: 1,
    title: "Legal Metrology (Packaged Commodities) Rules, 2011",
    status: "official",
    categories: [
      "food",
      "beverage",
      "cosmetic",
      "personal_care",
      "household",
      "baby_care",
      "pet_care",
      "supplement",
      "other",
    ],
    coverageTier: "general_pack_rules",
    machineContext:
      "For a retail pre-package, report only clearly visible general declarations potentially relevant under the Packaged Commodities Rules: manufacturer/packer/importer identity and address, generic or common commodity name, net quantity, month/year or other prescribed date declaration where applicable, retail sale price inclusive of taxes, and consumer-care contact details. Applicability and exemptions depend on package and transaction type.",
    source: {
      publisher: "Department of Consumer Affairs, Government of India",
      title: "Legal Metrology (Packaged Commodities) Rules, 2011 — consolidated with amendments",
      url: "https://consumeraffairs.nic.in/sites/default/files/file-uploads/latestnews/LM_PCR_All_Amendements.pdf",
      effectiveDate: "2011-04-01",
      accessedDate: ACCESSED_DATE,
    },
    limitations: [
      "Applicability, exemptions, package size, institutional/industrial use, and later amendments require case-specific review.",
      "Do not infer that a declaration is missing unless the relevant package panel is fully visible and readable.",
      "This pack supports consumer information, not an enforcement or legal conclusion.",
    ],
  },
  {
    id: "in.cdsco.cosmetics-rules-2020-labelling.v1",
    version: 1,
    title: "Cosmetics Rules, 2020 — labelling context",
    status: "official",
    categories: ["cosmetic", "personal_care"],
    coverageTier: "category_rules",
    machineContext:
      "For a product that is actually a cosmetic under the Cosmetics Rules, describe only readable label particulars potentially relevant to rule 34 and related provisions, including cosmetic name, manufacturer and manufacturing-premises address, use-before/expiry declaration, batch number, manufacturing licence number, net contents, and ingredient information where applicable. Imported cosmetics can have additional particulars. Do not classify a borderline drug/cosmetic product from marketing copy alone.",
    source: {
      publisher: "Central Drugs Standard Control Organization",
      title: "Cosmetics Rules, 2020 (G.S.R. 763(E), 15 December 2020)",
      url: "https://www.cdsco.gov.in/opencms/en/Acts-and-rules/Cosmetics-Rules/",
      effectiveDate: "2020-12-15",
      accessedDate: ACCESSED_DATE,
    },
    limitations: [
      "This initial pack covers visible labelling context only; it does not assess formulation, safety substantiation, licensing validity, import registration, or prohibited ingredients.",
      "Whether a product legally falls within the cosmetic definition may require specialist classification.",
      "Later amendments and product-specific requirements must be checked before any formal conclusion.",
    ],
  },
  {
    id: "in.fssai.advertising-claims-2018.v1",
    version: 1,
    title: "FSSAI Advertising and Claims Regulations, 2018",
    status: "official",
    categories: ["food", "beverage", "supplement"],
    coverageTier: "category_rules",
    machineContext:
      "For printed food claims, preserve the exact wording and supporting package facts. Non-addition claims such as no added sugar require the conditions in regulation 6; do not declare compliance or violation from an image when compound ingredients or other required context are unreadable.",
    source: {
      publisher: "Food Safety and Standards Authority of India",
      title: "Food Safety and Standards (Advertising and Claims) Regulations, 2018 — compendium",
      url: "https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Advertising_Claims_Regulations_04_10_2022.pdf",
      effectiveDate: "2019-07-01",
      accessedDate: ACCESSED_DATE,
    },
    limitations: [
      "Literal claim/ingredient consistency is not a laboratory, compliance, or enforcement conclusion.",
      "Compound ingredients, naturally occurring sugars, substitutions, exemptions, and later amendments can change the assessment.",
    ],
  },
  {
    id: "experimental.in.fssai.inr-draft-2022.v1",
    version: 1,
    title: "Experimental Indian Nutrition Rating presentation (2022 draft)",
    status: "experimental",
    categories: ["food", "beverage"],
    coverageTier: "label_only",
    machineContext:
      "Optional demonstration only: if every required nutrient and positive-factor input is readable and the draft category/exemption can be resolved, present a draft-derived INR illustration separately from official findings. Always call it experimental and based on the September 2022 draft. Never portray it as a current FSSAI rating, certification, mandatory mark, grievance ground, or overall health verdict. Omit the illustration when inputs or category are uncertain.",
    source: {
      publisher: "Food Safety and Standards Authority of India",
      title: "Draft Food Safety and Standards (Labelling & Display) Amendment Regulations, 2022",
      url: "https://www.fssai.gov.in/upload/uploadfiles/files/Draft_Notification_HFSS_20_09_2022.pdf",
      effectiveDate: null,
      accessedDate: ACCESSED_DATE,
    },
    limitations: [
      "This source is a draft notification, not an enacted or official consumer rating for the product.",
      "The demonstration must remain visually and semantically separate from enacted-rule findings.",
      "It cannot support a complaint route, enforcement statement, or product-level health conclusion.",
      "Values inferred from an image are insufficient when any required calculation input or exemption status is unclear.",
    ],
  },
] as const satisfies readonly RulePack[];

export const ENABLED_RULE_PACK_IDS = RULE_PACKS.map((pack) => pack.id);
export const ENABLED_RULE_PACK_ID_SET: ReadonlySet<string> = new Set(ENABLED_RULE_PACK_IDS);
