import assert from "node:assert/strict";
import test from "node:test";
import type { D1DatabaseLike, D1PreparedStatement } from "../src/data/d1.ts";
import { ProfileRepository } from "../src/data/profile-repository.ts";
import { ScanRequestRepository } from "../src/intake/scan-repository.ts";
import {
  digestBrowserToken,
  generateBrowserToken,
  isBrowserToken,
  parsePreferredLanguage,
} from "../src/profile/browser-profile.ts";

test("browser identity tokens contain 256 random bits as unpadded base64url", () => {
  const tokens = new Set(Array.from({ length: 32 }, generateBrowserToken));
  assert.equal(tokens.size, 32);
  for (const token of tokens) {
    assert.equal(token.length, 43);
    assert.equal(isBrowserToken(token), true);
  }
  assert.equal(isBrowserToken("short"), false);
});

test("browser identity persists only the stable SHA-256 digest", async () => {
  const token = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const digest = await digestBrowserToken(token);
  assert.equal(digest.length, 64);
  assert.equal(await digestBrowserToken(token), digest);
  assert.equal(digest.includes(token), false);
});

test("preferred language accepts exactly the twelve supported codes", () => {
  for (const language of ["en", "hi", "mr", "bn", "ta", "te", "kn", "gu", "ml", "pa", "or", "ur"])
    assert.equal(parsePreferredLanguage(language), language);
  assert.equal(parsePreferredLanguage("fr"), null);
  assert.equal(parsePreferredLanguage(null), null);
});

test("identity lookup is scoped to web device and a digest", async () => {
  const observed: unknown[] = [];
  const db = fakeDb({ profile_id: "profile-1" }, observed);
  const id = await new ProfileRepository(db).findProfileIdByIdentity("web_device", "digest");
  assert.equal(id, "profile-1");
  assert.deepEqual(observed, ["web_device", "digest"]);
  assert.match(db.lastQuery, /subject_digest = \?/);
});

test("web scans bind the durable profile id", async () => {
  const observed: unknown[] = [];
  const db = fakeDb(null, observed, 1);
  const inserted = await new ScanRequestRepository(db).insertWeb({
    id: "scan-1", profileId: "profile-1", analysisId: "analysis-1",
    idempotencyKey: "idem", accessTokenDigest: "access-digest", language: "mr", createdAt: "now",
  });
  assert.equal(inserted, true);
  assert.deepEqual(observed, ["scan-1", "profile-1", "analysis-1", "idem", "access-digest", "mr", "now"]);
  assert.doesNotMatch(db.lastQuery, /VALUES \(\?, NULL/);
});

function fakeDb(firstValue: Record<string, unknown> | null, observed: unknown[], changes = 0): D1DatabaseLike & { lastQuery: string } {
  const db = {
    lastQuery: "",
    prepare(query: string): D1PreparedStatement {
      db.lastQuery = query;
      const statement: D1PreparedStatement = {
        bind(...values: unknown[]) { observed.push(...values); return statement; },
        async first<T>() { return firstValue as T | null; },
        async run() { return { success: true, meta: { changes } }; },
      };
      return statement;
    },
  };
  return db;
}
