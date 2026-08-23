import type { CoverageTier, ProductCategory } from "../domain/analysis.ts";

export type KnowledgeStatus = "official" | "experimental";

export interface OfficialSource {
  publisher: string;
  title: string;
  url: string;
  effectiveDate: string | null;
  accessedDate: string;
}

export interface RulePack {
  id: string;
  version: 1;
  title: string;
  status: KnowledgeStatus;
  categories: readonly ProductCategory[];
  coverageTier: CoverageTier;
  machineContext: string;
  source: OfficialSource;
  limitations: readonly string[];
}

export type ServicePurpose =
  | "food_business_lookup"
  | "food_grievance"
  | "bis_licence_lookup"
  | "bis_complaint"
  | "general_consumer_grievance";

export interface ServiceDirectoryEntry {
  id: string;
  version: 1;
  title: string;
  status: "official";
  categories: readonly ProductCategory[];
  purposes: readonly ServicePurpose[];
  url: string;
  routingConstraints: readonly string[];
  integration: "external_handoff_only";
  source: OfficialSource;
  limitations: readonly string[];
}

export interface KnowledgeValidationIssue {
  path: string;
  message: string;
}
