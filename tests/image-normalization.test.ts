import assert from "node:assert/strict";
import test from "node:test";

import type { ImagesBindingLike } from "../src/intake/contracts.ts";
import { ImageValidationError, sha256Hex } from "../src/intake/image.ts";
import { normalizeImage } from "../src/intake/normalization.ts";

function binding(options: { width?: number; height?: number } = {}): ImagesBindingLike {
  return {
    info: async () => ({
      width: options.width ?? 1200,
      height: options.height ?? 800,
      format: "jpeg",
    }),
  };
}

test("preserves the original encoded bytes and pixel dimensions", async () => {
  const raw = Uint8Array.from([0xff, 0xd8, 0xff, ...new TextEncoder().encode("Exif GPS metadata and original pixels")]);
  const validated = await normalizeImage(raw, binding());
  assert.deepEqual(validated.bytes, raw);
  assert.equal(validated.mime, "image/jpeg");
  assert.equal(validated.width, 1200);
  assert.equal(validated.height, 800);
  assert.equal(validated.normalizationVersion, "validated-original.v1");
});

test("rejects decompression-bomb dimensions without altering the image", async () => {
  await assert.rejects(
    () => normalizeImage(Uint8Array.of(0xff, 0xd8, 0xff), binding({ width: 10_000, height: 10_000 })),
    /dimensions are too large/,
  );
});

test("rejects invalid decoded dimensions", async () => {
  await assert.rejects(
    () => normalizeImage(Uint8Array.of(0xff, 0xd8, 0xff), binding({ width: 0, height: 800 })),
    /invalid dimensions/,
  );
});

test("fails closed when decode validation is unavailable", async () => {
  await assert.rejects(
    () => normalizeImage(Uint8Array.of(0xff, 0xd8, 0xff), undefined),
    ImageValidationError,
  );
});

test("original-byte cache identity changes when encoded metadata changes", async () => {
  const first = await normalizeImage(
    Uint8Array.from([0xff, 0xd8, 0xff, ...new TextEncoder().encode("pixels + EXIF one")]),
    binding(),
  );
  const second = await normalizeImage(
    Uint8Array.from([0xff, 0xd8, 0xff, ...new TextEncoder().encode("pixels + EXIF two")]),
    binding(),
  );
  assert.notEqual(await sha256Hex(first.bytes), await sha256Hex(second.bytes));
});
