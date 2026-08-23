import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnalysisCacheKey,
  detectImageMime,
  ImageValidationError,
  isFresh,
  MAX_IMAGE_BYTES,
  sha256Hex,
  validateImageBytes,
} from "../src/intake/image.ts";

test("detects supported images from magic bytes rather than declared headers", () => {
  assert.equal(detectImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(detectImageMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectImageMime(new TextEncoder().encode("RIFF0000WEBP")), "image/webp");
  assert.equal(detectImageMime(new TextEncoder().encode("not an image")), null);
});

test("rejects empty, oversized and unsupported image bytes", () => {
  assert.throws(() => validateImageBytes(new Uint8Array()), ImageValidationError);
  assert.throws(() => validateImageBytes(new Uint8Array(MAX_IMAGE_BYTES + 1)), /12 MB/);
  assert.throws(() => validateImageBytes(new TextEncoder().encode("GIF89a")), /valid JPG/);
});

test("SHA-256 uses stable lowercase hexadecimal output", async () => {
  assert.equal(
    await sha256Hex("front-of-pack"),
    "a657eed1a0093a366543f46008bcebc252b58f10a3ea1355a2dec96781865691",
  );
});

test("cache identity changes when any semantic input changes", async () => {
  const base = {
    normalizedImageHash: "image-hash",
    language: "en" as const,
    modelId: "gpt-5.6-terra",
    promptVersion: "prompt.v1",
    schemaVersion: "schema.v1",
    rulesVersion: "rules.v1",
    servicesVersion: "services.v1",
    engineVersion: "engine.v1",
  };
  const first = await buildAnalysisCacheKey(base);
  assert.equal(first.length, 64);
  assert.equal(await buildAnalysisCacheKey(base), first);
  assert.notEqual(await buildAnalysisCacheKey({ ...base, language: "hi" }), first);
  assert.notEqual(await buildAnalysisCacheKey({ ...base, rulesVersion: "rules.v2" }), first);
  assert.notEqual(await buildAnalysisCacheKey({ ...base, engineVersion: "engine.v2" }), first);
});

test("freshness treats no expiry as fresh and rejects elapsed expiry", () => {
  const now = new Date("2026-08-23T12:00:00.000Z");
  assert.equal(isFresh(null, now), true);
  assert.equal(isFresh("2026-08-23T12:00:01.000Z", now), true);
  assert.equal(isFresh("2026-08-23T12:00:00.000Z", now), false);
});
