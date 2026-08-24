import assert from "node:assert/strict";
import test from "node:test";

import { evaluateWholePack } from "../src/engine/index.ts";

test("derives whole-bottle added sugar from the pack's own printed RDA", () => {
  const signals = evaluateWholePack({
    basis: "per_100ml", servingSize: 200, netQuantity: 475,
    values: { addedSugarsG: 10.5, saturatedFatG: 0, sodiumMg: 0, totalFatG: 0 },
    printedPerServeRdaPct: { addedSugars: 42, saturatedFat: null, sodium: null, totalFat: null },
  });
  assert.deepEqual(signals[0], {
    kind: "whole_pack_rda", nutrient: "added_sugars", severity: "high",
    wholePackAmount: 49.9, unit: "g", wholePackRdaPercent: 99.8,
    printedServingRdaPercent: 42, servingSize: 200, netQuantity: 475,
    quantityUnit: "ml", basis: "pack_printed_rda",
  });
});

test("derives serving reality for a multi-serving chips packet", () => {
  const signals = evaluateWholePack({
    basis: "per_100g", servingSize: 20, netQuantity: 52,
    values: { addedSugarsG: 0, saturatedFatG: 12.6, sodiumMg: 0, totalFatG: 0 },
    printedPerServeRdaPct: { addedSugars: null, saturatedFat: 11, sodium: null, totalFat: null },
  });
  assert.equal(signals[0].wholePackRdaPercent, 28.6);
  assert.equal(signals[0].severity, "moderate");
});

test("flags a high whole-container value even when one serving equals the container", () => {
  const signals = evaluateWholePack({
    basis: "per_100ml", servingSize: 250, netQuantity: 250,
    values: { addedSugarsG: 11, saturatedFatG: 0, sodiumMg: 0, totalFatG: 0 },
    printedPerServeRdaPct: { addedSugars: 54, saturatedFat: null, sodium: null, totalFat: null },
  });
  assert.equal(signals[0]?.wholePackAmount, 27.5);
  assert.equal(signals[0]?.wholePackRdaPercent, 54);
  assert.equal(signals[0]?.severity, "high");
});

test("does not manufacture a decision from missing or rounding-noise data", () => {
  assert.deepEqual(evaluateWholePack(null), []);
  assert.deepEqual(evaluateWholePack({
    basis: "per_100g", servingSize: 20, netQuantity: 52,
    values: { addedSugarsG: 1, saturatedFatG: 1, sodiumMg: 1, totalFatG: 1 },
    printedPerServeRdaPct: { addedSugars: 1, saturatedFat: 1, sodium: 1, totalFat: 1 },
  }), []);
});

test("keeps every independently material nutrient signal", () => {
  const signals = evaluateWholePack({
    basis: "per_100g", servingSize: 100, netQuantity: 100,
    values: { addedSugarsG: 25, saturatedFatG: 12, sodiumMg: 900, totalFatG: 35 },
    printedPerServeRdaPct: { addedSugars: 50, saturatedFat: 55, sodium: 55, totalFat: 50 },
  });
  assert.deepEqual(new Set(signals.map((signal) => signal.nutrient)), new Set(["added_sugars", "saturated_fat", "sodium", "total_fat"]));
});
