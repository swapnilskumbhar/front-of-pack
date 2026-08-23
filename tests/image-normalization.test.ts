import assert from "node:assert/strict";
import test from "node:test";

import { sha256Hex } from "../src/intake/image.ts";
import { normalizeImage } from "../src/intake/normalization.ts";

function jpeg(width = 1200, height = 800, suffix = ""): Uint8Array {
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08,
    height >> 8, height & 0xff, width >> 8, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    ...new TextEncoder().encode(suffix), 0xff, 0xd9]);
}

test("preserves the original encoded bytes and pixel dimensions", async () => {
  const raw = jpeg(1200, 800, "Exif GPS metadata and original pixels");
  const validated = await normalizeImage(raw, undefined);
  assert.deepEqual(validated.bytes, raw);
  assert.equal(validated.mime, "image/jpeg");
  assert.equal(validated.width, 1200);
  assert.equal(validated.height, 800);
  assert.equal(validated.normalizationVersion, "validated-original.v2");
});

test("rejects decompression-bomb dimensions without altering the image", async () => {
  await assert.rejects(
    () => normalizeImage(jpeg(10_000, 10_000), undefined),
    /dimensions are too large/,
  );
});

test("rejects invalid decoded dimensions", async () => {
  await assert.rejects(
    () => normalizeImage(jpeg(0, 800), undefined),
    /invalid dimensions/,
  );
});

test("fails closed when encoded dimensions are unavailable", async () => {
  await assert.rejects(() => normalizeImage(Uint8Array.of(0xff, 0xd8, 0xff), undefined), /dimensions/);
});

test("original-byte cache identity changes when encoded metadata changes", async () => {
  const first = await normalizeImage(
    jpeg(1200, 800, "pixels + EXIF one"),
    undefined,
  );
  const second = await normalizeImage(
    jpeg(1200, 800, "pixels + EXIF two"),
    undefined,
  );
  assert.notEqual(await sha256Hex(first.bytes), await sha256Hex(second.bytes));
});
