import type { ServiceDirectoryEntry } from "./types.ts";

const ACCESSED_DATE = "2026-08-23";
const ALL_CONSUMER_CATEGORIES = [
  "food", "beverage", "cosmetic", "personal_care", "household", "baby_care",
  "pet_care", "supplement", "other",
] as const;

export const SERVICE_DIRECTORY = [
  {
    id: "in.fssai.foscos.v1",
    version: 1,
    title: "FSSAI FoSCoS / Food Safety Connect",
    status: "official",
    categories: ["food", "beverage", "supplement"],
    purposes: ["food_business_lookup", "food_grievance"],
    url: "https://foscos.fssai.gov.in/consumergrievance/",
    routingConstraints: [
      "Route only a food-related matter involving packaged food, food premises, or an online food aggregator/delivery platform.",
      "For an FBO lookup, require a clearly printed FSSAI licence/registration number or ask the user to enter it; never fabricate or fuzzy-match a number.",
      "For a grievance, show an editable evidence summary and require the user to open the official portal and submit it themselves.",
      "Do not route an experimental INR illustration as complaint evidence.",
    ],
    integration: "external_handoff_only",
    source: {
      publisher: "Food Safety and Standards Authority of India",
      title: "Food Safety Connect consumer grievance portal and FAQ",
      url: "https://foscos.fssai.gov.in/consumergrievance/faqs",
      effectiveDate: null,
      accessedDate: ACCESSED_DATE,
    },
    limitations: [
      "The application does not query FoSCoS, authenticate a licence, file a grievance, or track its status.",
      "The official portal requires the consumer's own registration/OTP and supporting details.",
    ],
  },
  {
    id: "in.bis.care.v1",
    version: 1,
    title: "BIS Care",
    status: "official",
    categories: ["cosmetic", "personal_care", "household", "baby_care", "other"],
    purposes: ["bis_licence_lookup", "bis_complaint"],
    url: "https://www.bis.gov.in/bis-apps/?lang=en",
    routingConstraints: [
      "Route licence verification only when a BIS Standard Mark licence number (CM/L), CRS registration number (R-number), or relevant HUID is clearly printed or entered by the user.",
      "Choose the matching BIS Care verification function; do not treat a logo by itself as a verified licence.",
      "Route complaints only for BIS-certified products, suspected misuse of a BIS Standard Mark, or BIS services, and require the user to submit through BIS Care/official portal.",
    ],
    integration: "external_handoff_only",
    source: {
      publisher: "Bureau of Indian Standards",
      title: "BIS Care App",
      url: "https://www.bis.gov.in/bis-apps/?lang=en",
      effectiveDate: null,
      accessedDate: ACCESSED_DATE,
    },
    limitations: [
      "The application does not call BIS systems, verify a licence/HUID/R-number, or submit a complaint.",
      "BIS certification does not apply to every consumer-product category or every product within a category.",
    ],
  },
  {
    id: "in.consumer-affairs.nch.v1",
    version: 1,
    title: "National Consumer Helpline",
    status: "official",
    categories: ALL_CONSUMER_CATEGORIES,
    purposes: ["general_consumer_grievance"],
    url: "https://consumerhelpline.gov.in/",
    routingConstraints: [
      "Use for a general consumer transaction grievance when a more specific food or BIS route is not clearly applicable, or when the user requests the general consumer channel.",
      "Present only an editable draft and evidence checklist; the consumer must register/login and submit on the official channel.",
      "Do not claim that routing creates a docket number, starts proceedings, or replaces an appropriate Consumer Commission.",
    ],
    integration: "external_handoff_only",
    source: {
      publisher: "Department of Consumer Affairs, Government of India",
      title: "National Consumer Helpline 2.0",
      url: "https://consumerhelpline.gov.in/public/about",
      effectiveDate: null,
      accessedDate: ACCESSED_DATE,
    },
    limitations: [
      "The application does not register, submit, or track an NCH grievance.",
      "NCH is described by the Department as a pre-litigation alternate dispute-redress mechanism; it is not a court or a product regulator determination.",
    ],
  },
] as const satisfies readonly ServiceDirectoryEntry[];

export const ENABLED_SERVICE_IDS = SERVICE_DIRECTORY.map((service) => service.id);
export const ENABLED_SERVICE_ID_SET: ReadonlySet<string> = new Set(ENABLED_SERVICE_IDS);
