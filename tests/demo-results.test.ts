import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { DEMO_LABELS, DEMO_RESULTS } from "../src/demo/results.ts";
import { ENABLED_RULE_PACK_ID_SET, ENABLED_SERVICE_ID_SET } from "../src/knowledge/index.ts";
import { validateAnalysisResult } from "../src/validation/analysis-result.ts";

test("every public cached demo has a real image and a valid current-schema result", () => {
  for (const demo of DEMO_LABELS) {
    assert.ok(demo.imageSrc, `${demo.id} is missing a demo image`);
    assert.ok(existsSync(new URL(`../public${demo.imageSrc}`, import.meta.url)), `${demo.id} image does not exist`);
    const result = DEMO_RESULTS[demo.id];
    assert.ok(result, `${demo.id} is missing a result`);
    const report = validateAnalysisResult(result, {
      allowedRuleIds: ENABLED_RULE_PACK_ID_SET,
      allowedServiceIds: ENABLED_SERVICE_ID_SET,
    });
    assert.equal(report.valid, true, `${demo.id}: ${JSON.stringify(report.errors)}`);
  }
});

test("the grocery-grid demo is image-backed, non-synthetic, and matches three real products", () => {
  const demo = DEMO_LABELS.find((candidate) => candidate.id === "grid");
  assert.equal(demo?.imageSrc, "/demo/bigbasket-breakfast-grid.png");
  assert.match(demo?.detail ?? "", /public grocery grid/i);
  const result = DEMO_RESULTS.grid;
  assert.equal(result.analyzedCount, 3);
  assert.deepEqual(result.items.map((item) => item.identity.brandAsPrinted), ["Quaker", "Kellogg's", "Kellogg's"]);
  assert.doesNotMatch(result.disclaimer, /synthetic/i);
});
