import assert from "node:assert/strict";
import test from "node:test";

import { evaluateClaimConsistency } from "../src/engine/index.ts";

test("flags a literal sulphate-free and SLES package contradiction", () => {
  const signals = evaluateClaimConsistency(["100% Natural", "Sulphate Free"], ["aqua", "sles", "fragrance"], "personal_care");
  assert.equal(signals.length, 1);
  assert.equal(signals[0].testId, "claim.sulphate-free");
  assert.equal(signals[0].foundIngredient, "sles");
});

test("does not confuse sodium lauryl sulfoacetate with SLS", () => {
  assert.deepEqual(evaluateClaimConsistency(["Sulphate Free"], ["sodium lauryl sulfoacetate"], "personal_care"), []);
});

test("applies the official no-added-sugar consistency check to explicit sugar", () => {
  const signals = evaluateClaimConsistency(["No Added Sugar"], ["water", "sugar", "fruit pulp"], "beverage");
  assert.equal(signals[0].ruleId, "in.fssai.advertising-claims-2018.v1");
});

test("does not apply category-specific tests to unrelated products", () => {
  assert.deepEqual(evaluateClaimConsistency(["No Added Sugar"], ["sugar"], "cosmetic"), []);
});
