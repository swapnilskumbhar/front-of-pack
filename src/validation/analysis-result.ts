import {
  COVERAGE_TIERS,
  ANALYSIS_SCHEMA_VERSION,
  MAX_PRODUCTS_PER_ANALYSIS,
  MAX_SERIALIZED_ANALYSIS_BYTES,
  PRODUCT_CATEGORIES,
  FINDING_TOPICS,
  WEB_RESEARCH_OUTCOMES,
  type AnalysisResult,
} from "../domain/analysis.ts";
import { SUPPORTED_LANGUAGES } from "../domain/language.ts";
import { isMissingInformationFinding } from "../engine/presentation.ts";

export type AnalysisValidationCode =
  | "invalid_shape"
  | "unsupported_language"
  | "unsupported_schema_version"
  | "invalid_item_count"
  | "count_mismatch"
  | "duplicate_position"
  | "duplicate_id"
  | "invalid_enum"
  | "unresolved_evidence"
  | "unresolved_citation"
  | "invalid_evidence_relationship"
  | "disallowed_rule_id"
  | "disallowed_service_id"
  | "invalid_url"
  | "invalid_experimental_semantics"
  | "forbidden_wording"
  | "serialized_size_exceeded"
  | "not_serializable";

export interface AnalysisValidationIssue {
  code: AnalysisValidationCode;
  path: string;
  message: string;
}

export interface AnalysisValidationOptions {
  allowedRuleIds: ReadonlySet<string>;
  allowedServiceIds: ReadonlySet<string>;
  maxSerializedBytes?: number;
}

export interface AnalysisValidationReport {
  valid: boolean;
  errors: AnalysisValidationIssue[];
  serializedBytes: number | null;
}

const FORBIDDEN_VERDICT = /\b(?:safe|unsafe|toxic|illegal|violation)\b/i;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isInteger = (value: unknown): value is number => Number.isInteger(value);
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

function isHttpUrl(value: unknown): boolean {
  if (!isString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Validates provider output without mutating, repairing, or paraphrasing it. */
export function validateAnalysisResult(
  input: unknown,
  options: AnalysisValidationOptions,
): AnalysisValidationReport {
  const errors: AnalysisValidationIssue[] = [];
  const add = (code: AnalysisValidationCode, path: string, message: string) =>
    errors.push({ code, path, message });

  let serializedBytes: number | null = null;
  try {
    const serialized = JSON.stringify(input);
    if (serialized === undefined) throw new TypeError("value is not JSON serializable");
    serializedBytes = new TextEncoder().encode(serialized).byteLength;
    const maximum = options.maxSerializedBytes ?? MAX_SERIALIZED_ANALYSIS_BYTES;
    if (serializedBytes > maximum) {
      add("serialized_size_exceeded", "$", `Serialized result is ${serializedBytes} bytes; maximum is ${maximum}.`);
    }
  } catch {
    add("not_serializable", "$", "Result must be JSON serializable.");
  }

  if (!isRecord(input)) {
    add("invalid_shape", "$", "Result must be an object.");
    return { valid: false, errors, serializedBytes };
  }

  if (input.schemaVersion !== ANALYSIS_SCHEMA_VERSION) {
    add("unsupported_schema_version", "$.schemaVersion", "Schema version is not supported.");
  }

  if (!isString(input.language) || !(SUPPORTED_LANGUAGES as readonly string[]).includes(input.language)) {
    add("unsupported_language", "$.language", "Language is not supported.");
  }

  const items = asArray(input.items);
  if (!Array.isArray(input.items)) add("invalid_shape", "$.items", "Items must be an array.");
  if (items.length > MAX_PRODUCTS_PER_ANALYSIS) {
    add("invalid_item_count", "$.items", `Items must contain zero to ${MAX_PRODUCTS_PER_ANALYSIS} products.`);
  }
  if (!isInteger(input.analyzedCount) || input.analyzedCount !== items.length) {
    add("count_mismatch", "$.analyzedCount", "analyzedCount must equal items.length.");
  }
  for (const field of ["unknownCount", "flaggedCount"] as const) {
    const value = input[field];
    if (!isInteger(value) || value < 0 || value > MAX_PRODUCTS_PER_ANALYSIS) {
      add("count_mismatch", `$.${field}`, `${field} must be an integer between zero and ${MAX_PRODUCTS_PER_ANALYSIS}.`);
    }
  }

  const positions = new Set<number>();
  const consumerText: Array<[string, unknown]> = [
    ["$.wholeImageSummary", input.wholeImageSummary],
    ["$.strongestMaterialFinding", input.strongestMaterialFinding],
    ["$.disclaimer", input.disclaimer],
  ];

  items.forEach((rawItem, itemIndex) => {
    const base = `$.items[${itemIndex}]`;
    if (!isRecord(rawItem)) {
      add("invalid_shape", base, "Product must be an object.");
      return;
    }
    if (!isInteger(rawItem.position)) add("invalid_shape", `${base}.position`, "Position must be an integer.");
    else if (positions.has(rawItem.position)) add("duplicate_position", `${base}.position`, "Product positions must be unique.");
    else positions.add(rawItem.position);

    if (!isString(rawItem.category) || !(PRODUCT_CATEGORIES as readonly string[]).includes(rawItem.category)) {
      add("invalid_enum", `${base}.category`, "Unknown product category.");
    }
    if (!isString(rawItem.webResearchOutcome) || !(WEB_RESEARCH_OUTCOMES as readonly string[]).includes(rawItem.webResearchOutcome)) {
      add("invalid_enum", `${base}.webResearchOutcome`, "Unknown web research outcome.");
    }
    if (rawItem.webMatchConfidence !== null && !["high", "medium", "low"].includes(String(rawItem.webMatchConfidence))) {
      add("invalid_enum", `${base}.webMatchConfidence`, "Web match confidence must be high, medium, low, or null.");
    }
    if (rawItem.webMatchBasis !== null && (!isString(rawItem.webMatchBasis) || rawItem.webMatchBasis.trim().length === 0)) {
      add("invalid_shape", `${base}.webMatchBasis`, "Web match basis must be a nonempty string or null.");
    }
    const coverage = isRecord(rawItem.coverage) ? rawItem.coverage : {};
    if (!isRecord(rawItem.coverage)) add("invalid_shape", `${base}.coverage`, "Coverage must be an object.");
    if (!isString(coverage.tier) || !(COVERAGE_TIERS as readonly string[]).includes(coverage.tier)) {
      add("invalid_enum", `${base}.coverage.tier`, "Unknown coverage tier.");
    }
    asArray(coverage.rulePackIds).forEach((id, index) => {
      if (!isString(id) || !options.allowedRuleIds.has(id)) {
        add("disallowed_rule_id", `${base}.coverage.rulePackIds[${index}]`, "Rule pack is not enabled.");
      }
    });

    const citations = asArray(rawItem.citations);
    const citationIds = new Set<string>();
    citations.forEach((rawCitation, index) => {
      const path = `${base}.citations[${index}]`;
      if (!isRecord(rawCitation) || !isString(rawCitation.id)) {
        add("invalid_shape", path, "Citation and citation id are required.");
        return;
      }
      if (citationIds.has(rawCitation.id)) add("duplicate_id", `${path}.id`, "Citation ids must be unique within a product.");
      citationIds.add(rawCitation.id);
      if (!isHttpUrl(rawCitation.url)) add("invalid_url", `${path}.url`, "Citation URL must use http or https.");
    });

    const evidence = asArray(rawItem.evidence);
    const evidenceIds = new Set<string>();
    const referencedCitationIds = new Set<string>();
    evidence.forEach((rawEvidence, index) => {
      const path = `${base}.evidence[${index}]`;
      if (!isRecord(rawEvidence) || !isString(rawEvidence.id)) {
        add("invalid_shape", path, "Evidence and evidence id are required.");
        return;
      }
      if (evidenceIds.has(rawEvidence.id)) add("duplicate_id", `${path}.id`, "Evidence ids must be unique within a product.");
      evidenceIds.add(rawEvidence.id);
      if (rawEvidence.citationId !== undefined && rawEvidence.citationId !== null && (!isString(rawEvidence.citationId) || !citationIds.has(rawEvidence.citationId))) {
        add("unresolved_citation", `${path}.citationId`, "Evidence citation must resolve within the same product.");
      }
      if (isString(rawEvidence.citationId) && citationIds.has(rawEvidence.citationId)) referencedCitationIds.add(rawEvidence.citationId);
      if (rawEvidence.origin === "hosted_web_search" && (!isString(rawEvidence.citationId) || rawEvidence.citationId.length === 0)) {
        add("invalid_evidence_relationship", `${path}.citationId`, `${String(rawEvidence.origin)} evidence requires a citation.`);
      }
      if (rawEvidence.origin === "hosted_web_search" && rawEvidence.visibleOnPackage !== false) {
        add("invalid_evidence_relationship", `${path}.visibleOnPackage`, "Hosted-search evidence cannot be described as visible on the package.");
      }
      if (rawEvidence.origin === "hosted_web_search" && isString(rawEvidence.citationId)) {
        const citation = citations.find((candidate) => isRecord(candidate) && candidate.id === rawEvidence.citationId);
        if (!isRecord(citation) || !isString(citation.providerSourceId) || citation.providerSourceId.length === 0) {
          add("invalid_evidence_relationship", `${path}.citationId`, "Hosted-search evidence requires a provider source citation.");
        }
      }
    });
    citations.forEach((rawCitation, index) => {
      if (isRecord(rawCitation) && isString(rawCitation.id) && !referencedCitationIds.has(rawCitation.id)) {
        add("invalid_evidence_relationship", `${base}.citations[${index}].id`, "Every citation must be referenced by evidence in the same product.");
      }
    });

    const hostedEvidenceIds = new Set(evidence.flatMap((candidate) =>
      isRecord(candidate) && isString(candidate.id) && candidate.origin === "hosted_web_search"
        ? [candidate.id] : []));
    const consumedEvidenceIds = new Set<string>();
    const visibleDecisionEvidenceIds = new Set<string>();
    const validateEvidenceRefs = (owner: unknown, path: string) => {
      if (!isRecord(owner) || !Array.isArray(owner.evidenceIds)) {
        add("invalid_shape", `${path}.evidenceIds`, "evidenceIds must be an array.");
        return;
      }
      owner.evidenceIds.forEach((id, index) => {
        if (!isString(id) || !evidenceIds.has(id)) add("unresolved_evidence", `${path}.evidenceIds[${index}]`, "Evidence must resolve within the same product.");
        else consumedEvidenceIds.add(id);
      });
    };

    validateEvidenceRefs({ evidenceIds: rawItem.webMatchEvidenceIds }, `${base}.webMatchEvidenceIds`);
    const webMatchEvidenceIds = new Set(asArray(rawItem.webMatchEvidenceIds).filter(isString));
    webMatchEvidenceIds.forEach((id) => {
      if (!hostedEvidenceIds.has(id)) {
        add("invalid_evidence_relationship", `${base}.webMatchEvidenceIds`, "Product-match evidence must be hosted-search evidence.");
      }
    });

    if (rawItem.nutrition !== null && rawItem.nutrition !== undefined) {
      const nutrition = rawItem.nutrition;
      if (!isRecord(nutrition)) {
        add("invalid_shape", `${base}.nutrition`, "Nutrition must be an object or null.");
      } else {
        validateEvidenceRefs(nutrition, `${base}.nutrition`);
        if (nutrition.source !== "package" && nutrition.source !== "hosted_web_search") {
          add("invalid_enum", `${base}.nutrition.source`, "Nutrition source is not supported.");
        }
        const expectedOrigin = nutrition.source;
        const hasMatchingEvidence = asArray(nutrition.evidenceIds).some((id) =>
          evidence.some((candidate) => isRecord(candidate) && candidate.id === id && candidate.origin === expectedOrigin));
        if (!hasMatchingEvidence) {
          add("invalid_evidence_relationship", `${base}.nutrition.evidenceIds`, "Nutrition must reference evidence with the declared provenance.");
        }
        const values = isRecord(nutrition.values) ? nutrition.values : {};
        const hasUsableValue = [values.addedSugarsG, values.saturatedFatG, values.sodiumMg, values.totalFatG]
          .some((value) => typeof value === "number" && Number.isFinite(value));
        if (nutrition.source === "hosted_web_search" && hasUsableValue) {
          asArray(nutrition.evidenceIds).filter(isString).forEach((id) => visibleDecisionEvidenceIds.add(id));
        }
      }
    }

    const findingIds = new Set<string>();
    asArray(rawItem.findings).forEach((finding, index) => {
      const path = `${base}.findings[${index}]`;
      validateEvidenceRefs(finding, path);
      if (!isRecord(finding)) return;
      if (!isString(finding.id)) add("invalid_shape", `${path}.id`, "Finding id is required.");
      else if (findingIds.has(finding.id)) add("duplicate_id", `${path}.id`, "Finding ids must be unique within a product.");
      else findingIds.add(finding.id);
      if (!isString(finding.topic) || !(FINDING_TOPICS as readonly string[]).includes(finding.topic)) {
        add("invalid_enum", `${path}.topic`, "Finding topic is not supported.");
      }
      const usesHostedEvidence = asArray(finding.evidenceIds).some((id) => evidence.some((candidate) =>
        isRecord(candidate) && candidate.id === id && candidate.origin === "hosted_web_search"));
      if (finding.kind === "label_fact" && usesHostedEvidence) {
        add("invalid_evidence_relationship", `${path}.kind`, "Hosted decision facts require a specific finding kind, not label_fact.");
      }
      if (usesHostedEvidence && finding.level !== "unknown" && isString(finding.title) && isString(finding.explanation) &&
          !isMissingInformationFinding(finding.title, finding.explanation)) {
        asArray(finding.evidenceIds).filter(isString).forEach((id) => visibleDecisionEvidenceIds.add(id));
      }
      const isExperimentalKind = finding.kind === "experimental_fop";
      if (finding.experimental !== isExperimentalKind) {
        add("invalid_experimental_semantics", `${path}.experimental`, "Only experimental_fop findings must be marked experimental.");
      }
      asArray(finding.ruleIds).forEach((id, ruleIndex) => {
        if (!isString(id) || !options.allowedRuleIds.has(id)) add("disallowed_rule_id", `${path}.ruleIds[${ruleIndex}]`, "Rule is not enabled.");
      });
      consumerText.push([`${path}.title`, finding.title], [`${path}.explanation`, finding.explanation], [`${path}.uncertainty`, finding.uncertainty]);
    });
    const visibleClaims = new Set(asArray(rawItem.claimsAsPrinted).filter(isString));
    const auditedClaims = new Set<string>();
    asArray(rawItem.claimAudits).forEach((audit, index) => {
      const path = `${base}.claimAudits[${index}]`;
      validateEvidenceRefs(audit, path);
      if (isRecord(audit)) {
        consumerText.push([`${path}.assessment`, audit.assessment]);
        if (!isString(audit.assessment) || audit.assessment.trim().length === 0) {
          add("invalid_shape", `${path}.assessment`, "Claim assessment must be nonempty.");
        }
        if (!isString(audit.claimAsPrinted) || !visibleClaims.has(audit.claimAsPrinted)) {
          add("invalid_evidence_relationship", `${path}.claimAsPrinted`, "Claim audit must match a claim visible in the submitted image.");
        } else if (auditedClaims.has(audit.claimAsPrinted)) {
          add("invalid_evidence_relationship", `${path}.claimAsPrinted`, "Visible claims must have exactly one audit.");
        } else auditedClaims.add(audit.claimAsPrinted);
        if (["supported", "partially_supported", "contradicted"].includes(String(audit.status))) {
          asArray(audit.evidenceIds).filter(isString).forEach((id) => visibleDecisionEvidenceIds.add(id));
        }
      }
    });
    visibleClaims.forEach((claim) => {
      if (!auditedClaims.has(claim)) add("invalid_evidence_relationship", `${base}.claimAudits`, `Visible claim is missing an audit: ${claim}`);
    });

    if (!Array.isArray(rawItem.profile)) {
      add("invalid_shape", `${base}.profile`, "Profile must be an array.");
    }
    asArray(rawItem.profile).forEach((tag, index) => {
      const path = `${base}.profile[${index}]`;
      validateEvidenceRefs(tag, path);
      if (!isRecord(tag) || !isString(tag.label)) add("invalid_shape", `${path}.label`, "Profile label is required.");
      else {
        consumerText.push([`${path}.label`, tag.label]);
        asArray(tag.evidenceIds).filter(isString).forEach((id) => visibleDecisionEvidenceIds.add(id));
      }
    });

    const consumedHostedEvidenceIds = new Set([...consumedEvidenceIds].filter((id) => hostedEvidenceIds.has(id)));
    const visibleDecisionHostedEvidenceIds = new Set([...visibleDecisionEvidenceIds].filter((id) => hostedEvidenceIds.has(id)));
    const usableWebMatch = rawItem.webMatchConfidence === "high" || rawItem.webMatchConfidence === "medium";
    const webNutrition = isRecord(rawItem.nutrition) && rawItem.nutrition.source === "hosted_web_search";
    if ((webNutrition || visibleDecisionHostedEvidenceIds.size > 0) && !usableWebMatch) {
      add("invalid_evidence_relationship", `${base}.webMatchConfidence`, "Web-backed conclusions require a high or medium exact-product match.");
    }
    if (rawItem.webResearchOutcome === "decision_facts_found") {
      if (!usableWebMatch || webMatchEvidenceIds.size === 0 || !isString(rawItem.webMatchBasis) || rawItem.webMatchBasis.trim().length === 0) {
        add("invalid_evidence_relationship", `${base}.webResearchOutcome`, "Decision facts require a usable match and a specific match basis.");
      }
      if (hostedEvidenceIds.size === 0 || visibleDecisionHostedEvidenceIds.size === 0) {
        add("invalid_evidence_relationship", `${base}.webResearchOutcome`, "Decision facts require cited hosted evidence consumed by a visible decision fact.");
      }
      hostedEvidenceIds.forEach((id) => {
        if (!consumedHostedEvidenceIds.has(id)) add("invalid_evidence_relationship", `${base}.evidence`, `Hosted decision evidence is not consumed: ${id}`);
      });
    }
    if (rawItem.webResearchOutcome === "not_needed" &&
        (hostedEvidenceIds.size > 0 || webMatchEvidenceIds.size > 0 || rawItem.webMatchConfidence !== null || rawItem.webMatchBasis !== null)) {
      add("invalid_evidence_relationship", `${base}.webResearchOutcome`, "not_needed cannot retain a web match or hosted-search evidence.");
    }
    if (rawItem.webResearchOutcome === "identity_only" &&
        (!usableWebMatch || hostedEvidenceIds.size === 0 || webMatchEvidenceIds.size === 0 || !isString(rawItem.webMatchBasis) || rawItem.webMatchBasis.trim().length === 0)) {
      add("invalid_evidence_relationship", `${base}.webResearchOutcome`, "identity_only requires a cited usable identity match and a specific basis.");
    }
    if (rawItem.webResearchOutcome === "no_sufficient_match" &&
        (!isString(rawItem.webMatchBasis) || rawItem.webMatchBasis.trim().length === 0 || usableWebMatch)) {
      add("invalid_evidence_relationship", `${base}.webResearchOutcome`, "no_sufficient_match requires a specific basis without a usable match.");
    }
    if ((rawItem.webResearchOutcome === "identity_only" || rawItem.webResearchOutcome === "no_sufficient_match") &&
        (webNutrition || visibleDecisionHostedEvidenceIds.size > 0 || [...hostedEvidenceIds].some((id) => !webMatchEvidenceIds.has(id)))) {
      add("invalid_evidence_relationship", `${base}.webResearchOutcome`, "Identity-only or unmatched research cannot support consumer conclusions.");
    }

    if (rawItem.serviceRoute !== null) {
      const route = isRecord(rawItem.serviceRoute) ? rawItem.serviceRoute : {};
      if (!isRecord(rawItem.serviceRoute)) add("invalid_shape", `${base}.serviceRoute`, "Service route must be an object or null.");
      if (!isString(route.serviceId) || !options.allowedServiceIds.has(route.serviceId)) {
        add("disallowed_service_id", `${base}.serviceRoute.serviceId`, "Service is not enabled.");
      }
      consumerText.push([`${base}.serviceRoute.reason`, route.reason]);
    }
    consumerText.push([`${base}.summary`, rawItem.summary], [`${base}.retakeGuidance`, rawItem.retakeGuidance]);
    asArray(coverage.limitations).forEach((text, index) => consumerText.push([`${base}.coverage.limitations[${index}]`, text]));
  });

  consumerText.forEach(([path, value]) => {
    if (isString(value) && FORBIDDEN_VERDICT.test(value)) add("forbidden_wording", path, "Consumer-facing text contains forbidden verdict wording.");
  });

  return { valid: errors.length === 0, errors, serializedBytes };
}

export function isValidAnalysisResult(input: unknown, options: AnalysisValidationOptions): input is AnalysisResult {
  return validateAnalysisResult(input, options).valid;
}
