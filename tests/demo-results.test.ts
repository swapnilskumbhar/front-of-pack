import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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

test("the cart demo is image-backed, non-synthetic, and matches five real products in image order", () => {
  const demo = DEMO_LABELS.find((candidate) => candidate.id === "cart");
  assert.equal(demo?.label, "Five-item cart");
  assert.equal(demo?.detail, "User cart · cached result");
  assert.equal(demo?.imageSrc, "/demo/cart-five-items.jpeg");
  const imageUrl = new URL(`../public${demo.imageSrc}`, import.meta.url);
  assert.equal(
    createHash("sha256").update(readFileSync(imageUrl)).digest("hex"),
    "77ab7b7e7c5027fb97c21e47e9d826f74a21d7cdd72f236e931921e30a30ca0f",
  );

  const result = DEMO_RESULTS.cart;
  assert.equal(result.analyzedCount, 5);
  assert.deepEqual(result.items.map((item) => item.position), [1, 2, 3, 4, 5]);
  assert.deepEqual(result.items.map((item) => item.identity.brandAsPrinted), [
    "The Health Factory",
    "The Whole Truth",
    "Patanjali",
    "Kurkure",
    "Balaji",
  ]);
  assert.doesNotMatch(result.disclaimer, /synthetic/i);
});
