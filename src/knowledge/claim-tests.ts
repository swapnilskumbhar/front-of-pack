import type { ProductCategory } from "../domain/analysis.ts";

export interface ClaimConsistencyTest {
  id: string;
  label: string;
  claimPatterns: readonly RegExp[];
  contradictingIngredients: readonly string[];
  categories: readonly ProductCategory[];
  ruleId: string;
  sourceUrl: string;
  limitation: string;
}

export const CLAIM_TESTS: readonly ClaimConsistencyTest[] = [
  {
    id: "claim.no-added-sugar",
    label: "No added sugar",
    claimPatterns: [/\bno added sugar(s)?\b/iu, /\bwithout added sugar(s)?\b/iu],
    contradictingIngredients: ["sugar", "sucrose", "glucose", "dextrose", "fructose", "honey", "molasses", "corn syrup", "invert syrup", "jaggery"],
    categories: ["food", "beverage"],
    ruleId: "in.fssai.advertising-claims-2018.v1",
    sourceUrl: "https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Advertising_Claims_Regulations_04_10_2022.pdf",
    limitation: "Literal ingredient consistency only; naturally occurring sugars and compound ingredients require the regulation's full context.",
  },
  {
    id: "claim.sulphate-free",
    label: "Sulphate free",
    claimPatterns: [/\bsul(?:ph|f)ate[- ]free\b/iu, /\bno sul(?:ph|f)ates?\b/iu],
    contradictingIngredients: [
      "sodium lauryl sulfate", "sodium lauryl sulphate", "sls",
      "sodium laureth sulfate", "sodium laureth sulphate", "sles",
      "ammonium lauryl sulfate", "ammonium lauryl sulphate",
      "ammonium laureth sulfate", "ammonium laureth sulphate",
      "sodium coco sulfate", "sodium coco sulphate",
      "sodium c12 15 pareth sulfate", "sodium c12 15 pareth sulphate",
    ],
    categories: ["cosmetic", "personal_care", "household"],
    ruleId: "in.cdsco.cosmetics-rules-2020-labelling.v1",
    sourceUrl: "https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2022/cos_rules/CR_G.S.R.%20763%28E%29%20dt_15.12.2020_COSMETICS%20RULES%202020.pdf",
    limitation: "Literal package inconsistency only; this is not a laboratory or enforcement determination.",
  },
  {
    id: "claim.paraben-free",
    label: "Paraben free",
    claimPatterns: [/\bparaben[- ]free\b/iu, /\bno parabens?\b/iu],
    contradictingIngredients: ["methylparaben", "ethylparaben", "propylparaben", "butylparaben", "isobutylparaben"],
    categories: ["cosmetic", "personal_care"],
    ruleId: "in.cdsco.cosmetics-rules-2020-labelling.v1",
    sourceUrl: "https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2022/cos_rules/CR_G.S.R.%20763%28E%29%20dt_15.12.2020_COSMETICS%20RULES%202020.pdf",
    limitation: "Literal package inconsistency only; spelling and compound ingredients must be readable.",
  },
  {
    id: "claim.no-preservatives",
    label: "No preservatives",
    claimPatterns: [/\bno (added )?preservatives?\b/iu, /\bpreservative[- ]free\b/iu],
    contradictingIngredients: ["sodium benzoate", "potassium sorbate", "calcium propionate", "ins 211", "ins 202", "preservative 211", "preservative 202"],
    categories: ["food", "beverage", "cosmetic", "personal_care"],
    ruleId: "in.fssai.advertising-claims-2018.v1",
    sourceUrl: "https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Advertising_Claims_Regulations_04_10_2022.pdf",
    limitation: "Applied only where the named preservative is explicitly transcribed; equivalent-function substitutions are not inferred.",
  },
] as const;
