import { ANALYSIS_SCHEMA_VERSION } from "./types.ts";

const stringArray = { type: "array", items: { type: "string" } } as const;
const nullableString = { type: ["string", "null"] } as const;

const identity = {
  type: "object",
  additionalProperties: false,
  required: ["nameAsPrinted", "brandAsPrinted", "variantAsPrinted", "gtin", "confidence"],
  properties: {
    nameAsPrinted: nullableString,
    brandAsPrinted: nullableString,
    variantAsPrinted: nullableString,
    gtin: nullableString,
    confidence: { type: "string", enum: ["high", "medium", "low", "unknown"] },
  },
};

const evidence = {
  type: "object",
  additionalProperties: false,
  required: ["id", "origin", "excerptOrObservation", "citationId", "visibleOnPackage"],
  properties: {
    id: { type: "string" },
    origin: { type: "string", enum: ["package", "hosted_web_search", "verified_rule"] },
    excerptOrObservation: { type: "string" },
    citationId: nullableString,
    visibleOnPackage: { type: "boolean" },
  },
};

const citation = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "url", "providerSourceId"],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    url: { type: "string" },
    providerSourceId: nullableString,
  },
};

const finding = {
  type: "object",
  additionalProperties: false,
  required: ["id", "kind", "level", "title", "explanation", "evidenceIds", "ruleIds", "experimental"],
  properties: {
    id: { type: "string" },
    kind: { type: "string", enum: ["label_fact", "ingredient", "nutrition", "claim_audit", "regulatory_context", "experimental_fop"] },
    level: { type: "string", enum: ["information", "attention", "unknown"] },
    title: { type: "string" },
    explanation: { type: "string" },
    evidenceIds: stringArray,
    ruleIds: stringArray,
    experimental: { type: "boolean" },
  },
};

export const ANALYSIS_RESULT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "language", "analyzedCount", "unknownCount", "flaggedCount", "truncated", "wholeImageSummary", "strongestMaterialFinding", "items", "disclaimer"],
  properties: {
    schemaVersion: { type: "string", const: ANALYSIS_SCHEMA_VERSION },
    language: { type: "string", enum: ["en", "hi", "mr", "bn", "ta", "te", "kn", "gu", "ml", "pa", "or", "ur"] },
    analyzedCount: { type: "integer", minimum: 0, maximum: 6 },
    unknownCount: { type: "integer", minimum: 0, maximum: 6 },
    flaggedCount: { type: "integer", minimum: 0, maximum: 6 },
    truncated: { type: "boolean" },
    wholeImageSummary: { type: "string" },
    strongestMaterialFinding: nullableString,
    items: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["position", "identity", "category", "coverage", "summary", "findings", "claimAudits", "evidence", "citations", "serviceRoute", "needsClearerImage", "retakeGuidance"],
        properties: {
          position: { type: "integer", minimum: 1, maximum: 6 },
          identity,
          category: { type: "string", enum: ["food", "beverage", "cosmetic", "personal_care", "household", "baby_care", "pet_care", "supplement", "other", "unknown"] },
          coverage: {
            type: "object",
            additionalProperties: false,
            required: ["tier", "rulePackIds", "limitations"],
            properties: {
              tier: { type: "string", enum: ["category_rules", "general_pack_rules", "label_only"] },
              rulePackIds: stringArray,
              limitations: stringArray,
            },
          },
          summary: { type: "string" },
          findings: { type: "array", items: finding },
          claimAudits: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["claimAsPrinted", "assessment", "evidenceIds", "status"],
              properties: {
                claimAsPrinted: { type: "string" },
                assessment: { type: "string" },
                evidenceIds: stringArray,
                status: { type: "string", enum: ["supported", "partially_supported", "not_established", "not_assessable"] },
              },
            },
          },
          evidence: { type: "array", items: evidence },
          citations: { type: "array", items: citation },
          serviceRoute: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: ["serviceId", "reason"],
                properties: { serviceId: { type: "string" }, reason: { type: "string" } },
              },
            ],
          },
          needsClearerImage: { type: "boolean" },
          retakeGuidance: nullableString,
        },
      },
    },
    disclaimer: { type: "string" },
  },
};
