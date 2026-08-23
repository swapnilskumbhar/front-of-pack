import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundled = await build({
  entryPoints: [fileURLToPath(new URL("../src/index.ts", import.meta.url))],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const worker = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString("base64")}`);
const { consumeWebAnalysis, parseWebAnalysisMessage } = worker;

const validResult = {
  schemaVersion: "analysis-result.v1",
  language: "en",
  analyzedCount: 0,
  unknownCount: 0,
  flaggedCount: 0,
  truncated: false,
  wholeImageSummary: "No clearly readable package was found.",
  strongestMaterialFinding: null,
  items: [],
  disclaimer: "Independent educational label analysis.",
};

const pinnedVersions = {
  model_id: "gpt-5.6-terra",
  prompt_version: "terra-analysis.v1",
  schema_version: "analysis-result.v1",
  rules_version: "india-category-rules.v1",
  services_version: "india-consumer-services.v1",
};

function createDb({
  status = "queued", attempt = 1, mediaKey = "media/a", versions = pinnedVersions,
  failCompletionPersistence = false,
} = {}) {
  const state = { status, attempt, providerStartedAt: null, errorCode: null, complete: false };
  return {
    state,
    prepare(query) {
      let bindings = [];
      return {
        bind(...values) { bindings = values; return this; },
        async first() {
          if (query.includes("SELECT model_id")) return versions;
          return {
            id: "analysis-1", cache_key: "cache", image_hash: "hash",
            media_object_key: mediaKey, language: "en", status: state.status,
            attempt_number: state.attempt, queue_enqueued_at: "2026-08-23T00:00:00.000Z",
            provider_started_at: state.providerStartedAt, openai_response_id: null,
            result_json: null, web_search_used: 0, expires_at: null,
            error_code: state.errorCode, created_at: "2026-08-23T00:00:00.000Z",
            completed_at: null,
          };
        },
        async run() {
          if (query.includes("SET status = 'processing'")) {
            const canClaim = state.status === "queued" && state.attempt === bindings[2] &&
              state.providerStartedAt === null;
            if (canClaim) {
              state.status = "processing";
              state.providerStartedAt = bindings[0];
            }
            return { success: true, meta: { changes: canClaim ? 1 : 0 } };
          }
          if (query.includes("status = 'complete'")) {
            if (failCompletionPersistence) throw new Error("D1 completion unavailable");
            state.status = "complete";
            state.complete = true;
            return { success: true, meta: { changes: 1 } };
          }
          if (query.includes("status = 'failed'")) {
            if (failCompletionPersistence && !query.includes("post_claim_persistence_ambiguous")) {
              throw new Error("D1 failure persistence unavailable");
            }
            state.status = "failed";
            state.errorCode = query.includes("post_claim_persistence_ambiguous")
              ? "post_claim_persistence_ambiguous" : bindings[0];
            return { success: true, meta: { changes: 1 } };
          }
          throw new Error(`Unexpected SQL: ${query}`);
        },
      };
    },
  };
}

function createHarness(db = createDb()) {
  const calls = { fetch: 0, ack: 0, deleted: [] };
  const media = {
    httpMetadata: { contentType: "image/png" },
    async arrayBuffer() { return Uint8Array.from([1, 2, 3]).buffer; },
  };
  const env = {
    ENVIRONMENT: "test",
    OPENAI_API_KEY: "test-key",
    DB: db,
    MEDIA: {
      async get() { return media; },
      async delete(key) { calls.deleted.push(key); },
    },
  };
  const message = {
    body: { version: 1, trigger: "web", analysis_id: "analysis-1", attempt_number: 1 },
    ack() { calls.ack += 1; },
  };
  const okFetch = async (_url, init) => {
    calls.fetch += 1;
    const request = JSON.parse(init.body);
    assert.match(JSON.stringify(request.input), /data:image\/png;base64,AQID/);
    assert.match(JSON.stringify(request.input), /in\.fssai\.labelling-display-2020\.v1/);
    assert.match(JSON.stringify(request.input), /in\.consumer-affairs\.nch\.v1/);
    return Response.json({ id: "resp_1", output_text: JSON.stringify(validResult), output: [] });
  };
  return { calls, db, env, message, okFetch };
}

test("accepts only the exact versioned web queue contract", () => {
  assert.deepEqual(parseWebAnalysisMessage({
    version: 1, trigger: "web", analysis_id: "a", attempt_number: 1,
  }), { version: 1, trigger: "web", analysis_id: "a", attempt_number: 1 });
  assert.equal(parseWebAnalysisMessage({ analysis_id: "a", attempt_number: 1 }), null);
  assert.equal(parseWebAnalysisMessage({
    version: 1, trigger: "web", analysis_id: "a", attempt_number: 1, image: "secret",
  }), null);
});

test("successful processing makes one provider call, persists, deletes media, and acknowledges", async () => {
  const harness = createHarness();
  await consumeWebAnalysis(harness.message, harness.env, harness.okFetch);
  assert.equal(harness.calls.fetch, 1);
  assert.equal(harness.db.state.complete, true);
  assert.deepEqual(harness.calls.deleted, ["media/a"]);
  assert.equal(harness.calls.ack, 1);
});

test("duplicate or stale attempt makes zero provider calls", async () => {
  const harness = createHarness(createDb({ status: "processing" }));
  await consumeWebAnalysis(harness.message, harness.env, harness.okFetch);
  assert.equal(harness.calls.fetch, 0);
  assert.deepEqual(harness.calls.deleted, []);
  assert.equal(harness.calls.ack, 1);
});

test("semantic version mismatch fails before claim and makes zero provider calls", async () => {
  const db = createDb({ versions: { ...pinnedVersions, prompt_version: "future-prompt.v2" } });
  const harness = createHarness(db);
  await assert.rejects(
    consumeWebAnalysis(harness.message, harness.env, harness.okFetch),
    /prompt_version is not supported/,
  );
  assert.equal(harness.calls.fetch, 0);
  assert.equal(harness.db.state.status, "queued");
  assert.equal(harness.calls.ack, 0);
});

test("provider failure is persisted without throwing and media is deleted", async () => {
  const harness = createHarness();
  const failedFetch = async () => {
    harness.calls.fetch += 1;
    return new Response("failure", { status: 500 });
  };
  await consumeWebAnalysis(harness.message, harness.env, failedFetch);
  assert.equal(harness.calls.fetch, 1);
  assert.equal(harness.db.state.status, "failed");
  assert.equal(harness.db.state.errorCode, "terra_request_failed");
  assert.deepEqual(harness.calls.deleted, ["media/a"]);
  assert.equal(harness.calls.ack, 1);
});

test("hosted citation must match both provider source id and URL", async () => {
  const harness = createHarness();
  const result = {
    ...validResult,
    analyzedCount: 1,
    items: [{
      position: 1,
      citations: [{ id: "citation-1", url: "https://wrong.example/a", providerSourceId: "src-1" }],
      evidence: [{ origin: "hosted_web_search", citationId: "citation-1" }],
    }],
  };
  const fetchWithMismatchedSource = async () => {
    harness.calls.fetch += 1;
    return Response.json({
      id: "resp_1",
      output_text: JSON.stringify(result),
      output: [{ type: "web_search_call", action: { sources: [
        { id: "src-1", title: "Source", url: "https://right.example/a" },
      ] } }],
    });
  };
  await consumeWebAnalysis(harness.message, harness.env, fetchWithMismatchedSource);
  assert.equal(harness.calls.fetch, 1);
  assert.equal(harness.db.state.status, "failed");
  assert.equal(harness.db.state.errorCode, "analysis_processing_failed");
  assert.equal(harness.calls.ack, 1);
});

test("post-claim persistence failure is terminal, explicitly marked ambiguous, and acknowledged", async () => {
  const harness = createHarness(createDb({ failCompletionPersistence: true }));
  await consumeWebAnalysis(harness.message, harness.env, harness.okFetch);
  assert.equal(harness.calls.fetch, 1);
  assert.equal(harness.db.state.status, "failed");
  assert.equal(harness.db.state.errorCode, "post_claim_persistence_ambiguous");
  assert.deepEqual(harness.calls.deleted, ["media/a"]);
  assert.equal(harness.calls.ack, 1);
});
