export type DietFlag =
  | "animal_derived"
  | "may_be_animal_derived"
  | "insect_derived"
  | "milk_derived"
  | "egg_derived"
  | "jain_excluded"
  | "common_allergen";

export interface IngredientEntry {
  id: string;
  tokens: readonly string[];
  displayName: string;
  flags: readonly DietFlag[];
  note: string;
  sourceUrl: string;
  limitation: string;
}

const FSSAI_VEGAN = "https://www.fssai.gov.in/upload/notifications/2022/06/62ac3f9dba33cGazette_Notification_Vegan_Food_17_06_2022.pdf";
const FSSAI_ALLERGENS = "https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Labelling_Display_30_06_2022.pdf";
const FDA_CARMINE = "https://www.fda.gov/food/color-additives-information-consumers/color-additives-foods";

export const INGREDIENT_DICTIONARY: readonly IngredientEntry[] = [
  { id: "ins.120", tokens: ["ins 120", "e120", "carmine", "cochineal", "cochineal extract"], displayName: "INS 120 (carmine/cochineal)", flags: ["insect_derived"], note: "Carmine is a colour derived from cochineal insects.", sourceUrl: FDA_CARMINE, limitation: "Requires an exact printed token; colour class alone is insufficient." },
  { id: "ins.904", tokens: ["ins 904", "e904", "shellac"], displayName: "INS 904 (shellac)", flags: ["insect_derived"], note: "Shellac is purified lac resin secreted by the lac insect.", sourceUrl: "https://www.legislation.gov.uk/eudr/2008/84/pdfs/eudr_20080084_2009-03-06_en.pdf", limitation: "Exact printed ingredient only; manufacturing source is not independently verified." },
  { id: "ins.441", tokens: ["ins 441", "e441", "gelatin", "gelatine"], displayName: "INS 441 (gelatin)", flags: ["animal_derived"], note: "Gelatin is obtained from collagen produced from animal tissues.", sourceUrl: "https://www.fda.gov/food/food-export-lists/collagen-and-gelatin-export-lists", limitation: "Exact printed ingredient only; vegan status still depends on the complete production process." },
  { id: "ins.631", tokens: ["ins 631", "e631", "disodium inosinate"], displayName: "INS 631 (disodium inosinate)", flags: ["may_be_animal_derived"], note: "Its production source is not established by the additive name alone.", sourceUrl: FSSAI_VEGAN, limitation: "Do not infer animal origin without manufacturer or certification evidence." },
  { id: "ins.627", tokens: ["ins 627", "e627", "disodium guanylate"], displayName: "INS 627 (disodium guanylate)", flags: ["may_be_animal_derived"], note: "Its production source is not established by the additive name alone.", sourceUrl: FSSAI_VEGAN, limitation: "Do not infer animal origin without manufacturer or certification evidence." },
  { id: "ins.471", tokens: ["ins 471", "e471", "mono and diglycerides", "mono diglycerides"], displayName: "INS 471 (mono- and diglycerides)", flags: ["may_be_animal_derived"], note: "The printed additive name does not establish its fat source.", sourceUrl: FSSAI_VEGAN, limitation: "Plant or animal source requires manufacturer or certification evidence." },
  { id: "ins.920", tokens: ["ins 920", "e920", "l cysteine", "l-cysteine"], displayName: "INS 920 (L-cysteine)", flags: ["may_be_animal_derived"], note: "The printed name does not establish the production source.", sourceUrl: FSSAI_VEGAN, limitation: "Source requires manufacturer or certification evidence." },
  { id: "rennet", tokens: ["rennet"], displayName: "Rennet", flags: ["may_be_animal_derived"], note: "The label does not state whether the rennet is animal or microbial.", sourceUrl: FSSAI_VEGAN, limitation: "Do not infer origin from the word rennet alone." },
  { id: "milk", tokens: ["milk", "milk solids", "milk powder", "whey", "casein", "caseinate", "lactose", "ghee", "butter"], displayName: "Milk or milk-derived ingredient", flags: ["milk_derived", "common_allergen"], note: "Contains a printed milk-derived ingredient.", sourceUrl: FSSAI_ALLERGENS, limitation: "Does not assess cross-contact beyond the printed label." },
  { id: "egg", tokens: ["egg", "egg powder", "albumen", "ovalbumin"], displayName: "Egg or egg-derived ingredient", flags: ["egg_derived", "common_allergen"], note: "Contains a printed egg-derived ingredient.", sourceUrl: FSSAI_ALLERGENS, limitation: "Does not assess cross-contact beyond the printed label." },
  { id: "fish", tokens: ["fish", "fish oil", "anchovy", "tuna", "salmon"], displayName: "Fish or fish-derived ingredient", flags: ["animal_derived", "common_allergen"], note: "Contains a printed fish-derived ingredient.", sourceUrl: FSSAI_ALLERGENS, limitation: "Exact printed ingredient only." },
  { id: "crustacean", tokens: ["crustacean", "shrimp", "prawn", "crab", "lobster"], displayName: "Crustacean", flags: ["animal_derived", "common_allergen"], note: "Contains a printed crustacean ingredient.", sourceUrl: FSSAI_ALLERGENS, limitation: "Exact printed ingredient only." },
  { id: "meat", tokens: ["meat", "chicken", "mutton", "beef", "pork", "lard"], displayName: "Meat-derived ingredient", flags: ["animal_derived"], note: "Contains an explicitly printed meat-derived ingredient.", sourceUrl: FSSAI_VEGAN, limitation: "Exact printed ingredient only." },
  { id: "wheat", tokens: ["wheat", "wheat flour", "atta", "maida", "gluten", "barley", "rye", "oats"], displayName: "Gluten-containing cereal", flags: ["common_allergen"], note: "Contains a printed gluten-containing cereal.", sourceUrl: FSSAI_ALLERGENS, limitation: "Regulatory exceptions and gluten-free thresholds are not assessed." },
  { id: "soy", tokens: ["soy", "soya", "soybean", "soy lecithin", "soya lecithin"], displayName: "Soy", flags: ["common_allergen"], note: "Contains a printed soy ingredient.", sourceUrl: FSSAI_ALLERGENS, limitation: "Does not assess refined-oil exceptions or cross-contact." },
  { id: "peanut", tokens: ["peanut", "groundnut"], displayName: "Peanut", flags: ["common_allergen"], note: "Contains a printed peanut ingredient.", sourceUrl: FSSAI_ALLERGENS, limitation: "Does not assess refined-oil exceptions or cross-contact." },
  { id: "tree-nut", tokens: ["almond", "walnut", "cashew", "pistachio", "hazelnut", "pecan", "macadamia"], displayName: "Tree nut", flags: ["common_allergen"], note: "Contains a printed tree-nut ingredient.", sourceUrl: FSSAI_ALLERGENS, limitation: "Exact printed ingredient only." },
  { id: "sesame", tokens: ["sesame", "til"], displayName: "Sesame", flags: ["common_allergen"], note: "Contains a printed sesame ingredient.", sourceUrl: FSSAI_ALLERGENS, limitation: "Exact printed ingredient only." },
  { id: "sulphite", tokens: ["sulphite", "sulfite", "sulphur dioxide", "sulfur dioxide"], displayName: "Sulphite", flags: ["common_allergen"], note: "A sulphite ingredient is printed.", sourceUrl: FSSAI_ALLERGENS, limitation: "FSSAI declaration requirements depend on concentration." },
  { id: "jain.allium", tokens: ["onion", "garlic"], displayName: "Onion or garlic", flags: ["jain_excluded"], note: "Contains an ingredient excluded by many Jain diets.", sourceUrl: FSSAI_VEGAN, limitation: "Jain observance varies; this is preference information, not religious adjudication." },
  { id: "jain.root", tokens: ["potato", "carrot", "radish", "beetroot", "beet root", "ginger"], displayName: "Root vegetable", flags: ["jain_excluded"], note: "Contains a root vegetable excluded by many Jain diets.", sourceUrl: FSSAI_VEGAN, limitation: "Jain observance varies; this is preference information, not religious adjudication." },
] as const;
