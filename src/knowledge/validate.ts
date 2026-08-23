import type {
  KnowledgeValidationIssue,
  RulePack,
  ServiceDirectoryEntry,
} from "./types.ts";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EXPERIMENTAL_OVERCLAIM = /\b(?:is|are|constitutes?|provides?)\s+(?:an?\s+)?(?:mandatory|enacted|official|certif(?:ied|ication)|complaint evidence|grievance ground)\b/i;

function validateSource(
  source: RulePack["source"],
  path: string,
  issues: KnowledgeValidationIssue[],
) {
  if (!source.publisher.trim() || !source.title.trim()) {
    issues.push({ path, message: "Source publisher and title are required." });
  }
  try {
    if (new URL(source.url).protocol !== "https:") throw new Error("not HTTPS");
  } catch {
    issues.push({ path: `${path}.url`, message: "Official source must be a valid HTTPS URL." });
  }
  if (!ISO_DATE.test(source.accessedDate)) {
    issues.push({ path: `${path}.accessedDate`, message: "Accessed date must use YYYY-MM-DD." });
  }
  if (source.effectiveDate !== null && !ISO_DATE.test(source.effectiveDate)) {
    issues.push({ path: `${path}.effectiveDate`, message: "Effective date must be null or YYYY-MM-DD." });
  }
}

export function validateKnowledge(
  rulePacks: readonly RulePack[],
  services: readonly ServiceDirectoryEntry[],
): KnowledgeValidationIssue[] {
  const issues: KnowledgeValidationIssue[] = [];
  const ids = new Set<string>();
  const registerId = (id: string, path: string) => {
    if (!id.trim()) issues.push({ path, message: "Stable id is required." });
    if (ids.has(id)) issues.push({ path, message: "Knowledge ids must be globally unique." });
    ids.add(id);
  };

  rulePacks.forEach((pack, index) => {
    const path = `rulePacks[${index}]`;
    registerId(pack.id, `${path}.id`);
    validateSource(pack.source, `${path}.source`, issues);
    if (pack.categories.length === 0 || pack.limitations.length === 0 || !pack.machineContext.trim()) {
      issues.push({ path, message: "Categories, machine context, and explicit limitations are required." });
    }
    if (pack.status === "experimental") {
      if (!pack.id.startsWith("experimental.") || pack.coverageTier !== "label_only") {
        issues.push({ path, message: "Experimental packs require an experimental id and label_only coverage." });
      }
      const prose = [pack.machineContext, ...pack.limitations].join(" ");
      if (EXPERIMENTAL_OVERCLAIM.test(prose)) {
        issues.push({ path, message: "Experimental context must not imply official effect or complaint use." });
      }
      if (pack.source.effectiveDate !== null) {
        issues.push({ path: `${path}.source.effectiveDate`, message: "Draft/experimental sources cannot have an effective date." });
      }
    } else if (pack.id.startsWith("experimental.")) {
      issues.push({ path: `${path}.id`, message: "Official packs cannot use the experimental namespace." });
    }
  });

  services.forEach((service, index) => {
    const path = `services[${index}]`;
    registerId(service.id, `${path}.id`);
    validateSource(service.source, `${path}.source`, issues);
    try {
      if (new URL(service.url).protocol !== "https:") throw new Error("not HTTPS");
    } catch {
      issues.push({ path: `${path}.url`, message: "Service route must be a valid HTTPS URL." });
    }
    if (
      service.integration !== "external_handoff_only" ||
      service.routingConstraints.length === 0 ||
      service.limitations.length === 0
    ) {
      issues.push({ path, message: "Services require external-only routing constraints and limitations." });
    }
  });

  return issues;
}
