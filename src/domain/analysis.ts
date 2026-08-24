import type { LanguageCode } from "./language";
import type { ScanChannel } from "./profile";
import type { DerivedDecisionResult, ExtractedNutrition } from "../engine/types";

export const MAX_PRODUCTS_PER_ANALYSIS = 6 as const;
export const MAX_SERIALIZED_ANALYSIS_BYTES = 512 * 1024;
export const ANALYSIS_SCHEMA_VERSION = "analysis-result.v3" as const;

export const ANALYSIS_STATUSES = [
  "queued",
  "processing",
  "complete",
  "failed",
] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export const PRODUCT_CATEGORIES = [
  "food",
  "beverage",
  "cosmetic",
  "personal_care",
  "household",
  "baby_care",
  "pet_care",
  "supplement",
  "other",
  "unknown",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const COVERAGE_TIERS = [
  "category_rules",
  "general_pack_rules",
  "label_only",
] as const;
export type CoverageTier = (typeof COVERAGE_TIERS)[number];

export type EvidenceOrigin = "package" | "hosted_web_search" | "verified_rule";
export type FindingKind =
  | "label_fact"
  | "ingredient"
  | "nutrition"
  | "claim_audit"
  | "regulatory_context"
  | "experimental_fop";
export type FindingLevel = "information" | "attention" | "unknown";
export const FINDING_TOPICS = [
  "statutory_warning", "allergen", "added_sugars", "total_sugars", "saturated_fat",
  "sodium", "total_fat", "palm_oil", "preservatives", "colours", "claim", "diet",
  "nutrition", "ingredient", "label", "other",
] as const;
export type FindingTopic = (typeof FINDING_TOPICS)[number];

export interface Citation {
  id: string;
  title: string;
  url: string;
  publisher?: string;
  accessedAt?: string;
  /** Hosted-search citations must correspond to sources returned by the provider. */
  providerSourceId?: string | null;
}

export interface Evidence {
  id: string;
  origin: EvidenceOrigin;
  excerptOrObservation: string;
  citationId?: string | null;
  visibleOnPackage?: boolean;
}

export interface Finding {
  id: string;
  kind: FindingKind;
  /** Required in provider schema v3; optional here only for cached v2 compatibility. */
  topic?: FindingTopic;
  level: FindingLevel;
  title: string;
  explanation: string;
  evidenceIds: string[];
  ruleIds: string[];
  uncertainty?: string;
  experimental: boolean;
}

export interface ClaimAudit {
  claimAsPrinted: string;
  assessment: string;
  evidenceIds: string[];
  status: "supported" | "partially_supported" | "contradicted" | "not_established" | "not_assessable";
}

export interface ServiceRouteRef {
  /** Resolved only against the bundled, verified service directory. */
  serviceId: string;
  reason: string;
}

export interface Coverage {
  tier: CoverageTier;
  rulePackIds: string[];
  limitations: string[];
}

export interface ProductIdentity {
  nameAsPrinted: string | null;
  brandAsPrinted: string | null;
  variantAsPrinted: string | null;
  gtin: string | null;
  confidence: "high" | "medium" | "low" | "unknown";
}

export interface ProductProfileTag {
  label: string;
  evidenceIds: string[];
}

export interface ProductAnalysis {
  position: number;
  identity: ProductIdentity;
  category: ProductCategory;
  nutrition?: ExtractedNutrition | null;
  ingredientTokens?: string[];
  claimsAsPrinted?: string[];
  printedVegMark?: "veg" | "non_veg" | null;
  webMatchConfidence?: "high" | "medium" | "low" | null;
  webMatchBasis?: string | null;
  profile: ProductProfileTag[];
  coverage: Coverage;
  summary: string;
  findings: Finding[];
  claimAudits: ClaimAudit[];
  evidence: Evidence[];
  citations: Citation[];
  serviceRoute: ServiceRouteRef | null;
  needsClearerImage: boolean;
  retakeGuidance: string | null;
}

/**
 * Complete consumer-facing result. Terra authors the semantic provider fields in one response;
 * application code validates them and attaches reproducible decisions without paraphrasing.
 */
export interface AnalysisResult {
  schemaVersion: string;
  language: LanguageCode;
  analyzedCount: number;
  unknownCount: number;
  flaggedCount: number;
  truncated: boolean;
  wholeImageSummary: string;
  strongestMaterialFinding: string | null;
  items: ProductAnalysis[];
  disclaimer: string;
  derived?: DerivedDecisionResult;
}

export interface AnalysisRecord {
  id: string;
  cacheKey: string;
  imageHash: string;
  language: LanguageCode;
  status: AnalysisStatus;
  attemptNumber: number;
  mediaObjectKey: string | null;
  queueEnqueuedAt: string | null;
  providerStartedAt: string | null;
  openAiResponseId: string | null;
  result: AnalysisResult | null;
  webSearchUsed: boolean;
  expiresAt: string | null;
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
  engineVersion: string | null;
}

/** Queue payloads carry identifiers only; image bytes, PII, and model output stay out. */
export interface AnalysisQueueMessage {
  analysisId: string;
  attemptNumber: number;
}

export interface DeliveryQueueMessage {
  whatsappJobId: string;
  attemptNumber: number;
}

export interface ScanRequest {
  id: string;
  profileId: string | null;
  analysisId: string;
  channel: ScanChannel;
  idempotencyKey: string;
  language: LanguageCode;
  createdAt: string;
}
