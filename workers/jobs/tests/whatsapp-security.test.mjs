import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { downloadWhatsAppMedia, isAllowedMetaMediaUrl } from "../src/whatsapp/graph.ts";
import { consumeDelivery, parseDeliveryJob, renderWhatsAppChunks } from "../src/whatsapp/delivery.ts";
import { decryptIdentifier } from "../src/whatsapp/crypto.ts";

const config = { accessToken: "top-secret", apiVersion: "v23.0", phoneNumberId: "123" };

test("D1-style binary views are copied into valid Web Crypto BufferSources", async () => {
  const keyBytes = new Uint8Array(32).fill(4);
  const nonce = new Uint8Array(12).fill(8);
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    new TextEncoder().encode("media-id"),
  );
  assert.equal(
    await decryptIdentifier(
      new DataView(ciphertext),
      new Uint8Array(nonce),
      Buffer.from(keyBytes).toString("base64"),
    ),
    "media-id",
  );
});

test("cross-realm D1 ArrayBuffers retain nonce and ciphertext bytes", async () => {
  const keyBytes = new Uint8Array(32).fill(6);
  const nonce = new Uint8Array(12).fill(2);
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    new TextEncoder().encode("cross-realm-media"),
  ));
  const crossRealm = (bytes) => runInNewContext(`Uint8Array.from(${JSON.stringify([...bytes])}).buffer`);
  assert.equal(crossRealm(nonce) instanceof ArrayBuffer, false);
  assert.equal(
    await decryptIdentifier(
      crossRealm(ciphertext),
      crossRealm(nonce),
      Buffer.from(keyBytes).toString("base64"),
    ),
    "cross-realm-media",
  );
});

test("Meta media URL allow-list rejects attacker, HTTP, credentials and deceptive suffixes", () => {
  assert.equal(isAllowedMetaMediaUrl("https://lookaside.fbsbx.com/file"), true);
  assert.equal(isAllowedMetaMediaUrl("https://scontent.xx.fbcdn.net/file"), true);
  assert.equal(isAllowedMetaMediaUrl("https://evil.test/file"), false);
  assert.equal(isAllowedMetaMediaUrl("https://facebook.com.evil.test/file"), false);
  assert.equal(isAllowedMetaMediaUrl("http://lookaside.fbsbx.com/file"), false);
  assert.equal(isAllowedMetaMediaUrl("https://user:pass@lookaside.fbsbx.com/file"), false);
});

test("access token is never sent to a media URL controlled by an attacker", async () => {
  const calls = [];
  await assert.rejects(() => downloadWhatsAppMedia("media_1", config, async (url, init) => {
    calls.push({ url: String(url), auth: init?.headers?.authorization });
    return Response.json({ url: "https://attacker.test/steal" });
  }), /untrusted_media_download_url/);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/graph\.facebook\.com\/v23\.0\/media_1$/);
});

test("safe metadata download uses no redirects and bounded recognized media", async () => {
  const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00]);
  const calls = [];
  const result = await downloadWhatsAppMedia("media_1", config, async (url, init) => {
    calls.push({ url: String(url), init });
    if (calls.length === 1) return Response.json({ url: "https://lookaside.fbsbx.com/file", mime_type: "image/jpeg", file_size: 4 });
    return new Response(jpg, { headers: { "content-type": "image/jpeg", "content-length": "4" } });
  });
  assert.deepEqual(result.bytes, jpg);
  assert.equal(calls[0].init.redirect, "manual");
  assert.equal(calls[1].init.redirect, "manual");
  assert.equal(calls[1].init.headers.authorization, "Bearer top-secret");
});

test("delivery contract is ID-only and renderer emits one Unicode-safe bounded message", () => {
  assert.deepEqual(parseDeliveryJob({ version: 1, whatsapp_job_id: "job" }), { version: 1, whatsapp_job_id: "job" });
  assert.equal(parseDeliveryJob({ version: 1, whatsapp_job_id: "job", recipient: "9199" }), null);
  const chunks = renderWhatsAppChunks({ summary: "x".repeat(20_000) });
  assert.equal(chunks.length, 1);
  assert.equal(Array.from(chunks[0]).length, 3_500);
  const localized = renderWhatsAppChunks({
    wholeImageSummary: "लेबल विश्लेषण पूर्ण झाले.",
    items: [{ identity: { brandAsPrinted: "ब्रँड" }, summary: "पॅकवरील माहिती." }],
    disclaimer: "ही शैक्षणिक माहिती आहे.",
  });
  assert.match(localized.join("\n"), /पॅकवरील माहिती/);
});

test("WhatsApp rendering leads with named indicators and removes generic metadata", () => {
  const message = renderWhatsAppChunks({
    wholeImageSummary: "Quick summary",
    items: [{
      identity: { nameAsPrinted: "Product" }, summary: "Short product summary",
      findings: [
        { title: "Info first in model", explanation: "Info", level: "information" },
        { title: "Warning", explanation: "Act on this", level: "attention" },
        { title: "Second fact", explanation: "Useful", level: "information" },
        { title: "Hidden fact", explanation: "Extra", level: "information" },
      ],
      claimAudits: [{ claimAsPrinted: "Marketing claim", assessment: "Needs more evidence", status: "not_established" }],
      citations: [{ title: "Official source", url: "https://example.test/source" }],
    }],
  })[0];
  assert.ok(message.indexOf("WARNING") < message.indexOf("Product"));
  assert.match(message, /INFO FIRST IN MODEL/);
  assert.match(message, /SECOND FACT/);
  assert.match(message, /HIDDEN FACT/);
  assert.doesNotMatch(message, /Marketing claim/);
  assert.doesNotMatch(message, /example\.test/);
  assert.doesNotMatch(message, /SOME CAUTION|Product match/);
});

test("WhatsApp uses searched evidence as an indicator without exposing source plumbing", () => {
  const message = renderWhatsAppChunks({ language: "en", items: [{
    position: 1, identity: { nameAsPrinted: "Ratlami Sev", confidence: "high" }, webMatchConfidence: "high",
    findings: [{ id: "f", kind: "ingredient", title: "Peanut allergen", explanation: "Contains peanut; avoid for peanut allergy.", level: "attention", evidenceIds: ["e"] }],
    evidence: [{ id: "e", origin: "hosted_web_search", excerptOrObservation: "Official ingredients list peanut.", citationId: "c" }],
    citations: [{ id: "c", title: "Official product page", url: "https://example.test/ratlami-sev" }],
  }] })[0];
  assert.match(message, /PEANUT ALLERGEN/);
  assert.match(message, /Contains peanut; avoid for peanut allergy/);
  assert.doesNotMatch(message, /example\.test\/ratlami-sev/);
  assert.equal((message.match(/Official ingredients list peanut/g) ?? []).length, 0);
  assert.doesNotMatch(message, /Product match|Profile:/);
});

test("WhatsApp hides identity-only search evidence and does not invent caution", () => {
  const message = renderWhatsAppChunks({ language: "en", items: [{
    position: 1,
    identity: { nameAsPrinted: "Digestive", brandAsPrinted: "McVitie's", confidence: "high" },
    webMatchConfidence: "medium",
    summary: "Pack recipe cannot be confirmed.",
    findings: [{ id: "f", kind: "label_fact", title: "Back panel needed", explanation: "Ingredients are not visible.", level: "attention", evidenceIds: [] }],
    evidence: [{ id: "e", origin: "hosted_web_search", excerptOrObservation: "Retail page identifies a 100 g pack." }],
    citations: [{ title: "Retail page", url: "https://example.test/digestive" }],
    needsClearerImage: true,
    retakeGuidance: "Photograph the back panel.",
  }] })[0];
  assert.match(message, /NOT ENOUGH INFORMATION/);
  assert.doesNotMatch(message, /SOME CAUTION/);
  assert.doesNotMatch(message, /Retail page identifies/);
  assert.doesNotMatch(message, /example\.test/);
});

test("Red Bull response names caffeine and sugar instead of an umbrella caution", () => {
  const message = renderWhatsAppChunks({ language: "en", items: [{
    position: 1,
    identity: { nameAsPrinted: "Red Bull Energy Drink", brandAsPrinted: "Red Bull", confidence: "high" },
    summary: "Limit this high-sugar caffeinated drink.",
    rating: { score: 3, dimension: "nutrition", label: "Nutrition", basis: "High sugar and caffeine warning.", evidenceIds: ["ce", "se"], experimental: true },
    profile: [{ label: "CAFFEINATED", evidenceIds: ["ce"] }, { label: "HIGH SUGAR", evidenceIds: ["se"] }],
    findings: [
      { id: "c", kind: "label_fact", title: "Caffeine warning", explanation: "75 mg · Avoid for children, pregnancy and caffeine sensitivity.", level: "attention", evidenceIds: ["ce"] },
      { id: "s", kind: "nutrition", title: "High sugar", explanation: "27 g per 250 ml can.", level: "attention", evidenceIds: ["se"] },
    ],
    evidence: [
      { id: "ce", origin: "package", excerptOrObservation: "Caffeine warning printed." },
      { id: "se", origin: "hosted_web_search", excerptOrObservation: "27 g sugar per can." },
    ],
    webMatchConfidence: "high",
  }] })[0];
  assert.match(message, /^🔴 \*CAFFEINE WARNING\*/u);
  assert.match(message, /🔴 \*HIGH SUGAR\*\n27 g per 250 ml can/u);
  assert.match(message, /\*Rating:\* 3\/10 \(Nutrition · experimental\)/);
  assert.match(message, /\*Profile:\* CAFFEINATED · HIGH SUGAR/);
  assert.match(message, /\*Verdict:\* Limit this high-sugar caffeinated drink/);
  assert.doesNotMatch(message, /SOME CAUTION|Product match|https?:\/\//);
});

test("WhatsApp preserves every material warning and useful analysis point", () => {
  const findings = [
    ["Caffeine warning", "75 mg per can; restricted consumer groups should avoid it."],
    ["High sugar", "27 g per can; a material whole-pack sugar contribution."],
    ["High sodium", "810 mg per pack; a material whole-pack sodium contribution."],
    ["Allergen: milk", "Contains milk; relevant for anyone avoiding milk allergens."],
    ["Contains palm oil", "Palm olein is present in the matched ingredient list."],
    ["High saturated fat", "The matched pack has a material saturated-fat contribution."],
    ["Allergen: soy", "Contains soy; relevant for anyone avoiding soy allergens."],
    ["Claim contradiction", "A printed claim conflicts with a listed ingredient."],
  ].map(([title, explanation], index) => ({ id: `f${index}`, kind: "ingredient", title, explanation, level: "attention", evidenceIds: [] }));
  const message = renderWhatsAppChunks({ language: "en", items: [{
    position: 1, identity: { nameAsPrinted: "Product", confidence: "high" }, summary: "Multiple warnings deserve attention.",
    rating: { score: 2, dimension: "nutrition", label: "Nutrition", basis: "Multiple material warnings.", evidenceIds: [], experimental: true },
    profile: [{ label: "MULTIPLE WARNINGS", evidenceIds: [] }], findings, evidence: [],
  }] })[0];
  for (const [title] of findings.map((finding) => [finding.title])) assert.match(message, new RegExp(title, "iu"));
  assert.ok(Array.from(message).length > 450);
});

test("McVitie's response combines warnings with rating profile verdict and positive analysis", () => {
  const message = renderWhatsAppChunks({ language: "en", items: [{
    position: 1, identity: { brandAsPrinted: "McVitie's", nameAsPrinted: "Digestive", confidence: "high" },
    webMatchConfidence: "medium",
    rating: { score: 4, dimension: "ingredients", label: "Ingredients", basis: "Palm oil and wheat need attention.", evidenceIds: ["p", "w"], experimental: true },
    profile: [{ label: "PALM OIL", evidenceIds: ["p"] }, { label: "WHEAT ALLERGEN", evidenceIds: ["w"] }, { label: "WHOLEWHEAT", evidenceIds: ["g"] }],
    summary: "Palm oil and wheat need attention; wholewheat is a useful positive.",
    claimsAsPrinted: ["High in Fibre", "Made with whole wheat"],
    findings: [
      { id: "f1", kind: "ingredient", level: "attention", title: "Contains palm oil", explanation: "Palm oil listed online.", evidenceIds: ["p"] },
      { id: "f2", kind: "ingredient", level: "attention", title: "Allergen: wheat", explanation: "Wheat is declared online.", evidenceIds: ["w"] },
      { id: "f3", kind: "ingredient", level: "information", title: "Wholewheat content", explanation: "Official brand page describes wholewheat and fibre.", evidenceIds: ["g"] },
    ],
    claimAudits: [
      { claimAsPrinted: "High in Fibre", status: "not_assessable", assessment: "Nutrition panel is not visible.", evidenceIds: ["g"] },
      { claimAsPrinted: "Made with whole wheat", status: "partially_supported", assessment: "Online ingredients list refined and whole wheat flour.", evidenceIds: ["g"] },
    ],
    evidence: [
      { id: "p", origin: "hosted_web_search", excerptOrObservation: "Palm oil listed." },
      { id: "w", origin: "hosted_web_search", excerptOrObservation: "Wheat listed." },
      { id: "g", origin: "hosted_web_search", excerptOrObservation: "Wholewheat listed." },
    ],
  }] })[0];
  assert.match(message, /CONTAINS PALM OIL/);
  assert.match(message, /ALLERGEN: WHEAT/);
  assert.match(message, /\*Rating:\* 4\/10/);
  assert.match(message, /\*Profile:\* PALM OIL · WHEAT ALLERGEN · WHOLEWHEAT/);
  assert.match(message, /\*Verdict:\*/);
  assert.match(message, /\*Analysis:\*[\s\S]*WHOLEWHEAT CONTENT/);
  assert.match(message, /\*Claims:\*/);
  assert.match(message, /“High in Fibre” — Nutrition panel is not visible/);
  assert.match(message, /“Made with whole wheat” — Online ingredients list refined and whole wheat flour/);
});

test("WhatsApp omits the claims section when no package claim is visible", () => {
  const message = renderWhatsAppChunks({ language: "en", items: [{
    position: 1, identity: { nameAsPrinted: "Plain Product", confidence: "high" },
    rating: { score: null, dimension: "label_evidence", label: "Not rated", basis: "Insufficient evidence.", evidenceIds: [], experimental: true },
    profile: [], summary: "No visible marketing claim.", claimsAsPrinted: [], claimAudits: [], findings: [], evidence: [],
  }] })[0];
  assert.doesNotMatch(message, /\*Claims:\*/);
});

test("successful delivery reads stored output and clears all routing ciphertext", async () => {
  const keyBytes = new Uint8Array(32).fill(9);
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const nonce = new Uint8Array(12).fill(3);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, new TextEncoder().encode("919876543210"));
  let cleaned = false;
  const db = { prepare(sql) { return {
    bind() { return this; },
    async first() { return sql.includes("SELECT w.recipient") ? {
      recipient_ciphertext: ciphertext, recipient_nonce: nonce.buffer, status: "ready",
      send_attempts: 0,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      result_json: JSON.stringify({ summary: "Stored result only" }),
    } : null; },
    async run() { if (sql.includes("recipient_ciphertext = NULL")) cleaned = true;
      return { success: true, meta: { changes: 1 } }; },
  }; } };
  let acknowledged = false;
  const calls = [];
  await consumeDelivery({ body: { version: 1, whatsapp_job_id: "job" }, ack() { acknowledged = true; } }, {
    DB: db, DELIVERY_ENCRYPTION_KEY: Buffer.from(keyBytes).toString("base64"), ...config,
  }, async (url, init) => { calls.push({ url, body: init.body }); return new Response("{}", { status: 200 }); });
  assert.equal(calls.length, 1);
  assert.match(calls[0].body, /Stored result only/);
  assert.equal(cleaned, true);
  assert.equal(acknowledged, true);
});

async function deliveryFixture({ attempts = 0 } = {}) {
  const keyBytes = new Uint8Array(32).fill(7);
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const nonce = new Uint8Array(12).fill(5);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key,
    new TextEncoder().encode("919876543210"));
  const state = { status: "ready", attempts, cleared: false, error: null };
  const db = { prepare(sql) { return {
    values: [], bind(...values) { this.values = values; return this; },
    async first() { return {
      recipient_ciphertext: ciphertext, recipient_nonce: nonce.buffer, status: state.status,
      send_attempts: state.attempts,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      result_json: JSON.stringify({ summary: "नमस्कार 🌿" }),
    }; },
    async run() {
      if (sql.includes("send_attempts = send_attempts + 1")) {
        if (state.status !== "ready" || state.attempts >= 3) return { meta: { changes: 0 } };
        state.status = "processing"; state.attempts += 1; return { meta: { changes: 1 } };
      }
      if (sql.includes("CASE WHEN send_attempts < 3")) {
        state.status = state.attempts < 3 ? "ready" : "failed"; state.error = this.values[0];
        if (state.status === "failed") state.cleared = true;
        return { meta: { changes: 1 } };
      }
      if (sql.includes("status = 'sent'")) { state.status = "sent"; state.cleared = true; return { meta: { changes: 1 } }; }
      if (sql.includes("status = 'failed'")) { state.status = "failed"; state.cleared = true; state.error = this.values[0]; }
      return { meta: { changes: 1 } };
    },
  }; } };
  return { db, state, key: Buffer.from(keyBytes).toString("base64") };
}

test("atomic claim lets only one concurrent duplicate send", async () => {
  const fixture = await deliveryFixture();
  let sends = 0;
  const fetcher = async () => { sends += 1; await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response("{}", { status: 200 }); };
  const env = { DB: fixture.db, DELIVERY_ENCRYPTION_KEY: fixture.key, ...config };
  await Promise.all([1, 2].map(() => consumeDelivery({ body: { version: 1, whatsapp_job_id: "job" }, ack() {} }, env, fetcher)));
  assert.equal(sends, 1);
  assert.equal(fixture.state.attempts, 1);
  assert.equal(fixture.state.status, "sent");
  assert.equal(fixture.state.cleared, true);
});

test("retryable Graph failure restores ownership until capped", async () => {
  const fixture = await deliveryFixture({ attempts: 2 });
  let retries = 0;
  await consumeDelivery({ body: { version: 1, whatsapp_job_id: "job" }, ack() {}, retry() { retries += 1; } },
    { DB: fixture.db, DELIVERY_ENCRYPTION_KEY: fixture.key, ...config },
    async () => new Response("busy", { status: 503 }));
  assert.equal(retries, 0);
  assert.equal(fixture.state.attempts, 3);
  assert.equal(fixture.state.status, "failed");
  assert.equal(fixture.state.cleared, true);
});

test("retryable Graph failure preserves ciphertext before the attempt cap", async () => {
  const fixture = await deliveryFixture({ attempts: 0 });
  let retries = 0;
  await consumeDelivery({ body: { version: 1, whatsapp_job_id: "job" }, ack() {}, retry() { retries += 1; } },
    { DB: fixture.db, DELIVERY_ENCRYPTION_KEY: fixture.key, ...config },
    async () => new Response("rate limited", { status: 429 }));
  assert.equal(retries, 1);
  assert.equal(fixture.state.status, "ready");
  assert.equal(fixture.state.attempts, 1);
  assert.equal(fixture.state.cleared, false);
});

test("ambiguous network failure is terminal to prevent duplicate sends", async () => {
  const fixture = await deliveryFixture();
  let acknowledged = false;
  await consumeDelivery({ body: { version: 1, whatsapp_job_id: "job" }, ack() { acknowledged = true; } },
    { DB: fixture.db, DELIVERY_ENCRYPTION_KEY: fixture.key, ...config }, async () => { throw new Error("socket reset"); });
  assert.equal(fixture.state.status, "failed");
  assert.equal(fixture.state.error, "delivery_ambiguous");
  assert.equal(fixture.state.cleared, true);
  assert.equal(acknowledged, true);
});
