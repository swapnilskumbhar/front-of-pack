import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeWebAnalysis,
  digestScanAccessToken,
  generateScanAccessToken,
  isScanAccessToken,
  readBearerToken,
} from "../src/intake/access-token.ts";
import { ScanRequestRepository } from "../src/intake/scan-repository.ts";
import { AnalysisRepository } from "../src/data/analysis-repository.ts";
import type { D1DatabaseLike, D1PreparedStatement } from "../src/data/d1.ts";

test("scan capabilities contain 256 random bits encoded as unpadded base64url", () => {
  const tokens = new Set(Array.from({ length: 32 }, generateScanAccessToken));
  assert.equal(tokens.size, 32);
  for (const token of tokens) {
    assert.equal(token.length, 43);
    assert.equal(isScanAccessToken(token), true);
  }
  assert.equal(isScanAccessToken("short"), false);
});

test("only a strict bearer capability is accepted", () => {
  const token = generateScanAccessToken();
  assert.equal(readBearerToken(new Request("https://example.test", {
    headers: { Authorization: `Bearer ${token}` },
  })), token);
  assert.equal(readBearerToken(new Request("https://example.test")), null);
  assert.equal(readBearerToken(new Request("https://example.test", {
    headers: { Authorization: `Basic ${token}` },
  })), null);
});

test("authorization hashes the capability and scopes lookup to analysis and web channel", async () => {
  const token = generateScanAccessToken();
  const expectedDigest = await digestScanAccessToken(token);
  const observed: unknown[] = [];
  const db = fakeDb({ authorized: 1 }, observed);

  assert.equal(await authorizeWebAnalysis(db, "analysis-id", token), true);
  assert.deepEqual(observed, ["analysis-id", expectedDigest]);
  assert.match(db.lastQuery, /channel = 'web'/);
  assert.equal(await authorizeWebAnalysis(db, "analysis-id", "invalid"), false);
});

test("scan repository stores only the capability digest", async () => {
  const observed: unknown[] = [];
  const db = fakeDb(null, observed, 1);
  const inserted = await new ScanRequestRepository(db).insertWeb({
    id: "scan-id",
    analysisId: "analysis-id",
    idempotencyKey: "idempotency-digest",
    accessTokenDigest: "capability-digest",
    language: "en",
    createdAt: "2026-08-23T00:00:00.000Z",
  });
  assert.equal(inserted, true);
  assert.deepEqual(observed, [
    "scan-id",
    "analysis-id",
    "idempotency-digest",
    "capability-digest",
    "en",
    "2026-08-23T00:00:00.000Z",
  ]);
  assert.match(db.lastQuery, /access_token_digest/);
});

test("explicit retry installs fresh media and increments only the failed attempt", async () => {
  const observed: unknown[] = [];
  const db = fakeDb(null, observed, 1);
  const retried = await new AnalysisRepository(db).retry(
    "analysis-id",
    2,
    "2026-08-23T13:00:00.000Z",
    "analyses/analysis-id/retry-object",
  );
  assert.equal(retried, true);
  assert.match(db.lastQuery, /media_object_key = \?/);
  assert.match(db.lastQuery, /status = 'failed'/);
  assert.deepEqual(observed, [
    "2026-08-23T13:00:00.000Z",
    "analyses/analysis-id/retry-object",
    "analysis-id",
    2,
  ]);
});

function fakeDb(
  firstValue: Record<string, unknown> | null,
  observed: unknown[],
  changes = 0,
): D1DatabaseLike & { lastQuery: string } {
  const db = {
    lastQuery: "",
    prepare(query: string): D1PreparedStatement {
      db.lastQuery = query;
      const statement: D1PreparedStatement = {
        bind(...values: unknown[]) {
          observed.push(...values);
          return statement;
        },
        async first<T>() { return firstValue as T | null; },
        async run() { return { success: true, meta: { changes } }; },
      };
      return statement;
    },
  };
  return db;
}
