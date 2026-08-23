import type { LanguageCode } from "./language";

/** Every field participates in the canonical cache identity. */
export interface AnalysisCacheIdentityInputs {
  normalizedImageHash: string;
  language: LanguageCode;
  modelId: string;
  promptVersion: string;
  schemaVersion: string;
  rulesVersion: string;
  servicesVersion: string;
}

export interface CachePolicy {
  /** Web-backed results expire sooner; stale entries are never refreshed silently. */
  expiresAt: string | null;
  webSearchUsed: boolean;
}
