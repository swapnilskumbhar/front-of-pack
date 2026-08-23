export interface DemoRegistryRecord {
  identifier: string;
  identifierType: "FSSAI licence" | "BIS CM/L";
  displayName: string;
  category: string;
  status: "synthetic-demo-only";
  source: "local synthetic demonstration data";
}

const RECORDS: readonly DemoRegistryRecord[] = [
  { identifier: "10000000000001", identifierType: "FSSAI licence", displayName: "Annapurna Foods Demo", category: "Packaged food", status: "synthetic-demo-only", source: "local synthetic demonstration data" },
  { identifier: "CM/L-0000000001", identifierType: "BIS CM/L", displayName: "Everyday Homeware Demo", category: "Household", status: "synthetic-demo-only", source: "local synthetic demonstration data" },
];

export function normalizeRegistryIdentifier(value: string): string {
  return value.trim().toUpperCase();
}

export function findExactDemoRegistryRecord(value: string): DemoRegistryRecord | null {
  const exact = normalizeRegistryIdentifier(value);
  return RECORDS.find((record) => record.identifier === exact) ?? null;
}

export const DEMO_REGISTRY_IDENTIFIERS = RECORDS.map((record) => record.identifier);
