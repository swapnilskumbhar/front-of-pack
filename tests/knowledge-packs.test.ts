import assert from "node:assert/strict";
import test from "node:test";

import {
  ENABLED_RULE_PACK_IDS,
  ENABLED_SERVICE_IDS,
  RULE_PACKS,
  SERVICE_DIRECTORY,
  validateKnowledge,
  type RulePack,
} from "../src/knowledge/index.ts";

test("enabled knowledge is internally valid", () => {
  assert.deepEqual(validateKnowledge(RULE_PACKS, SERVICE_DIRECTORY), []);
});

test("enabled id sets change only through an intentional snapshot update", () => {
  assert.deepEqual(ENABLED_RULE_PACK_IDS, [
    "in.fssai.labelling-display-2020.v1",
    "in.legal-metrology.packaged-commodities-2011.v1",
    "in.cdsco.cosmetics-rules-2020-labelling.v1",
    "experimental.in.fssai.inr-draft-2022.v1",
  ]);
  assert.deepEqual(ENABLED_SERVICE_IDS, [
    "in.fssai.foscos.v1",
    "in.bis.care.v1",
    "in.consumer-affairs.nch.v1",
  ]);
});

test("validator rejects duplicate ids and missing/non-HTTPS official sources", () => {
  const broken = structuredClone(RULE_PACKS) as unknown as RulePack[];
  broken[1]!.id = broken[0]!.id;
  broken[1]!.source.url = "http://example.test/rules";
  broken[2]!.source.publisher = "";
  const messages = validateKnowledge(broken, SERVICE_DIRECTORY).map((issue) => issue.message);

  assert(messages.includes("Knowledge ids must be globally unique."));
  assert(messages.includes("Official source must be a valid HTTPS URL."));
  assert(messages.includes("Source publisher and title are required."));
});

test("validator rejects experimental packs that imply official or grievance use", () => {
  const broken = structuredClone(RULE_PACKS) as unknown as RulePack[];
  const experimental = broken.at(-1)!;
  experimental.coverageTier = "category_rules";
  experimental.machineContext = "This is a mandatory official rating and complaint evidence.";
  experimental.source.effectiveDate = "2022-09-14";
  const messages = validateKnowledge(broken, SERVICE_DIRECTORY).map((issue) => issue.message);

  assert(messages.includes("Experimental packs require an experimental id and label_only coverage."));
  assert(messages.includes("Experimental context must not imply official effect or complaint use."));
  assert(messages.includes("Draft/experimental sources cannot have an effective date."));
});
