import assert from "node:assert/strict";
import test from "node:test";
import type { ImagesBindingLike, ImagesInputLike } from "../src/intake/contracts.ts";
import { ImageValidationError, sha256Hex } from "../src/intake/image.ts";
import { MAX_NORMALIZED_BYTES, normalizeImage } from "../src/intake/normalization.ts";

const WEBP = new TextEncoder().encode("RIFF0000WEBPnormalized");

function binding(options: { width?: number; height?: number; output?: Uint8Array } = {}): ImagesBindingLike {
  const input: ImagesInputLike = {
    transform: () => input,
    output: async () => ({ response: () => new Response(options.output ?? WEBP) }),
  };
  return {
    info: async () => ({ width: options.width ?? 1200, height: options.height ?? 800, format: "jpeg" }),
    input: () => input,
  };
}

test("never passes raw bytes or EXIF marker through to normalized output", async () => {
  const raw = new TextEncoder().encode("\u00ff\u00d8\u00ffExif\0\0GPS:private-location");
  const normalized = await normalizeImage(raw, binding());
  assert.deepEqual(normalized.bytes, WEBP);
  assert.equal(new TextDecoder().decode(normalized.bytes).includes("private-location"), false);
  assert.notDeepEqual(normalized.bytes, raw);
});

test("rejects decompression-bomb dimensions before transformation", async () => {
  await assert.rejects(() => normalizeImage(Uint8Array.of(1), binding({ width: 10_000, height: 10_000 })), /dimensions are too large/);
});

test("fails closed when the Images binding is unavailable", async () => {
  await assert.rejects(() => normalizeImage(Uint8Array.of(1), undefined), ImageValidationError);
});

test("rejects normalized output beyond its byte cap", async () => {
  await assert.rejects(
    () => normalizeImage(Uint8Array.of(1), binding({ output: new Uint8Array(MAX_NORMALIZED_BYTES + 1) })),
    /normalized image is too large/,
  );
});

test("normalized hash is stable when source metadata differs but pixels normalize identically", async () => {
  const first = await normalizeImage(new TextEncoder().encode("pixels + EXIF one"), binding());
  const second = await normalizeImage(new TextEncoder().encode("pixels + EXIF two"), binding());
  assert.equal(await sha256Hex(first.bytes), await sha256Hex(second.bytes));
});
