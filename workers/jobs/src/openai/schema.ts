import { ANALYSIS_SCHEMA_VERSION } from "./types.ts";

const stringArray = { type: "array", maxItems: 12, items: { type: "string", maxLength: 160 } } as const;
const nullableString = { type: ["string", "null"], maxLength: 200 } as const;

const identity = {
  type: "object",
  additionalProperties: false,
  required: ["nameAsPrinted", "brandAsPrinted", "variantAsPrinted", "gtin", "confidence"],
  properties: {
    nameAsPrinted: nullableString,
    brandAsPrinted: nullableString,
    variantAsPrinted: nullableString,
    gtin: { type: ["string", "null"], maxLength: 64 },
    confidence: { type: "string", enum: ["high", "medium", "low", "unknown"] },
  },
};

const evidence = {
  type: "object",
  additionalProperties: false,
  required: ["id", "origin", "excerptOrObservation", "citationId", "visibleOnPackage"],
  properties: {
    id: { type: "string", maxLength: 80 },
    origin: { type: "string", enum: ["package", "hosted_web_search", "verified_rule"] },
    excerptOrObservation: { type: "string", maxLength: 500 },
    citationId: nullableString,
    visibleOnPackage: { type: "boolean" },
  },
};

const citation = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "url", "providerSourceId"],
  properties: {
    id: { type: "string", maxLength: 80 },
    title: { type: "string", maxLength: 200 },
    url: { type: "string", maxLength: 2048 },
    providerSourceId: nullableString,
  },
};

const finding = {
  type: "object",
  additionalProperties: false,
  required: ["id", "kind", "level", "title", "explanation", "evidenceIds", "ruleIds", "experimental"],
  properties: {
    id: { type: "string", maxLength: 80 },
    kind: { type: "string", enum: ["label_fact", "ingredient", "nutrition", "claim_audit", "regulatory_context", "experimental_fop"] },
    level: { type: "string", enum: ["information", "attention", "unknown"] },
    title: { type: "string", maxLength: 60 },
    explanation: { type: "string", maxLength: 180 },
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
    wholeImageSummary: { type: "string", maxLength: 160 },
    strongestMaterialFinding: { type: ["string", "null"], maxLength: 160 },
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
              limitations: { type: "array", maxItems: 4, items: { type: "string", maxLength: 240 } },
            },
          },
          summary: { type: "string", maxLength: 160 },
          findings: { type: "array", maxItems: 3, items: finding },
          claimAudits: {
            type: "array",
            maxItems: 2,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["claimAsPrinted", "assessment", "evidenceIds", "status"],
              properties: {
                claimAsPrinted: { type: "string", maxLength: 200 },
                assessment: { type: "string", maxLength: 300 },
                evidenceIds: stringArray,
                status: { type: "string", enum: ["supported", "partially_supported", "not_established", "not_assessable"] },
              },
            },
          },
          evidence: { type: "array", maxItems: 6, items: evidence },
          citations: { type: "array", maxItems: 4, items: citation },
          serviceRoute: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: ["serviceId", "reason"],
                properties: { serviceId: { type: "string", maxLength: 100 }, reason: { type: "string", maxLength: 240 } },
              },
            ],
          },
          needsClearerImage: { type: "boolean" },
          retakeGuidance: nullableString,
        },
      },
    },
    disclaimer: { type: "string", maxLength: 350 },
  },
};
