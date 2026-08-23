import assert from "node:assert/strict";
import test from "node:test";

import { evaluateDiet } from "../src/engine/index.ts";

test("veg mark and explicit gelatin produces a conflict", () => {
  const signals = evaluateDiet(["gelatin"], "veg", "food");
  assert.equal(signals[0]?.kind, "veg_mark_conflict");
});

test("veg mark alone produces no dietary signal", () => {
  assert.deepEqual(evaluateDiet([], "veg", "food"), []);
});

test("INS 631 without a veg mark reports source uncertainty only", () => {
  const signals = evaluateDiet(["flavour enhancer (INS 631)"], null, "food");
  assert.equal(signals[0]?.kind, "source_unclear");
  assert.equal(signals.some((signal) => signal.kind === "veg_mark_conflict"), false);
});

test("veg mark plus INS 631 remains source uncertainty, not conflict", () => {
  const signals = evaluateDiet(["disodium inosinate (INS 631)"], "veg", "food");
  assert.equal(signals[0]?.kind, "source_unclear");
});

test("onion produces Jain preference information", () => {
  const signals = evaluateDiet(["onion powder"], "veg", "food");
  assert.equal(signals[0]?.kind, "diet_profile");
  assert.equal(signals[0]?.matches.some((match) => match.flags.includes("jain_excluded")), true);
});

test("printed allergens are grouped without inferring cross-contact", () => {
  const signals = evaluateDiet(["wheat flour", "soy lecithin", "milk solids"], "veg", "food");
  const allergen = signals.find((signal) => signal.kind === "allergen_profile");
  assert.equal(allergen?.matches.length, 3);
});

test("empty ingredient tokens produce nothing", () => {
  assert.deepEqual(evaluateDiet(undefined, null, "food"), []);
});
