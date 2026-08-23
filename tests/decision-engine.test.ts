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

test("does not manufacture a decision from missing or rounding-noise data", () => {
  assert.deepEqual(evaluateWholePack(null), []);
  assert.deepEqual(evaluateWholePack({
    basis: "per_100g", servingSize: 20, netQuantity: 52,
    values: { addedSugarsG: 1, saturatedFatG: 1, sodiumMg: 1, totalFatG: 1 },
    printedPerServeRdaPct: { addedSugars: 1, saturatedFat: 1, sodium: 1, totalFat: 1 },
  }), []);
});
