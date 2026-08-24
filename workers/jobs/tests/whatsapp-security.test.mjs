import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { downloadWhatsAppMedia, isAllowedMetaMediaUrl, sendWhatsAppText } from "../src/whatsapp/graph.ts";
import { consumeDelivery, parseDeliveryJob, renderWhatsAppChunks, sendWhatsAppAnalysisFailure } from "../src/whatsapp/delivery.ts";
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

test("Graph text replies quote the exact inbound WhatsApp message", async () => {
  let payload;
  await sendWhatsAppText("919876543210", "Result", config, async (_url, init) => {
    payload = JSON.parse(init.body);
    return new Response("{}", { status: 200 });
  }, { replyToMessageId: "wamid.image_A+/==" });
  assert.deepEqual(payload, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "919876543210",
    context: { message_id: "wamid.image_A+/==" },
    type: "text",
    text: { preview_url: false, body: "Result" },
  });
  await assert.rejects(() => sendWhatsAppText("919876543210", "Result", config, fetch,
    { replyToMessageId: "bad id" }), /invalid_reply_message_id/);
});

test("delivery contract is ID-only and renderer emits Unicode-safe bounded chunks", () => {
  assert.deepEqual(parseDeliveryJob({ version: 1, whatsapp_job_id: "job" }), { version: 1, whatsapp_job_id: "job" });
  assert.equal(parseDeliveryJob({ version: 1, whatsapp_job_id: "job", recipient: "9199" }), null);
  const chunks = renderWhatsAppChunks({ summary: "x".repeat(20_000) });
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => Array.from(chunk).length <= 3_500));
  assert.equal(chunks.join(""), "x".repeat(20_000));
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
  assert.doesNotMatch(message, /╭─|╰─/u);
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

test("Vedaka-style incomplete analysis is honest, scoped, and never renders a fake score", () => {
  const claim = "VEDAKA PRODUCTS ARE HYGIENICALLY PACKED AND UNDERGO RIGOROUS AND STRINGENT LABORATORY TESTS TO MEET FOOD SAFETY NORMS";
  const message = renderWhatsAppChunks({ language: "hi", derived: { items: [{
    position: 1, signals: [], rating: { score: null, deductions: [] },
  }] }, items: [{
    position: 1,
    identity: { nameAsPrinted: "Red Masoor Dal (Split)", brandAsPrinted: "Vedaka", confidence: "high" },
    summary: "उत्पाद पहचाना गया; सामग्री और पोषण अभी सत्यापित नहीं हैं।",
    profile: [{ label: "शाकाहारी चिह्न", evidenceIds: ["p1"] }, { label: "500 g पैक", evidenceIds: ["p1"] }],
    webResearchOutcome: "identity_only",
    webMatchConfidence: "high",
    webMatchBasis: "नाम और 500 g पैक मिले; सामग्री सूची उपलब्ध नहीं।",
    claimsAsPrinted: [claim],
    claimAudits: [{ claimAsPrinted: claim, status: "not_established", assessment: "परीक्षण रिपोर्ट या स्वतंत्र प्रमाण उपलब्ध नहीं है।", evidenceIds: ["p1"] }],
    findings: [{ id: "missing", kind: "label_fact", topic: "label", title: "पैनल जानकारी नहीं", explanation: "सामग्री और पोषण पैनल पढ़ने योग्य नहीं हैं।", level: "unknown", evidenceIds: ["p1"] }],
    evidence: [{ id: "p1", origin: "package", excerptOrObservation: "नाम, 500 g और शाकाहारी चिह्न दिखते हैं।" }],
    needsClearerImage: true,
    retakeGuidance: "सामग्री और पोषण पैनल भेजें।",
  }] }).join("\n");

  assert.match(message, /^⚪ \*/u);
  assert.match(message, /सामग्री और पोषण पैनल भेजें/u);
  assert.match(message, /📦 \*Vedaka — Red Masoor Dal \(Split\)\*/u);
  assert.doesNotMatch(message, /—\/10|\*रेटिंग:\*/u);
  assert.match(message, /⚪ \*निष्कर्ष:\*/u);
  assert.match(message, /\*उत्पाद मिलान:\* उच्च · नाम और 500 g पैक मिले/u);
  assert.doesNotMatch(message, /साक्ष्य भरोसा/u);
  assert.ok(message.indexOf("परीक्षण रिपोर्ट या स्वतंत्र प्रमाण") < message.indexOf(`“${claim}”`));
  assert.equal((message.match(new RegExp(claim, "gu")) ?? []).length, 1);
});

test("visible marketing text without an audit is omitted fail-closed", () => {
  const message = renderWhatsAppChunks({ language: "en", items: [{
    position: 1, identity: { nameAsPrinted: "Product", confidence: "high" },
    summary: "More evidence is needed.", profile: [], claimsAsPrinted: ["MAGIC HEALTH"],
    claimAudits: [], findings: [], evidence: [], needsClearerImage: true, retakeGuidance: "Show the back panel.",
  }] }).join("\n");
  assert.doesNotMatch(message, /MAGIC HEALTH|\*Claims:\*/u);
});

test("unmatched search never borrows high confidence from image identity", () => {
  const message = renderWhatsAppChunks({ language: "en", items: [{
    position: 1, identity: { nameAsPrinted: "Product", confidence: "high" },
    webResearchOutcome: "no_sufficient_match", webMatchConfidence: null,
    webMatchBasis: "No sufficiently matched Indian recipe source was found.",
    summary: "Recipe and nutrition remain unverified.", profile: [], findings: [], evidence: [],
    claimsAsPrinted: [], claimAudits: [], needsClearerImage: true, retakeGuidance: "Show ingredients and nutrition.",
  }] }).join("\n");
  assert.match(message, /\*Product match:\* No sufficiently matched Indian recipe source was found\./u);
  assert.doesNotMatch(message, /\*Product match:\* high/u);
});

test("empty unverifiable-claim assessment is omitted without leaking English fallback", () => {
  const message = renderWhatsAppChunks({ language: "hi", items: [{
    position: 1, identity: { nameAsPrinted: "उत्पाद", confidence: "high" },
    summary: "अधिक जानकारी चाहिए।", profile: [], claimsAsPrinted: ["स्वास्थ्य का वादा"],
    claimAudits: [{ claimAsPrinted: "स्वास्थ्य का वादा", assessment: "", status: "not_established", evidenceIds: [] }],
    findings: [], evidence: [], needsClearerImage: true, retakeGuidance: "पीछे का पैनल भेजें।",
  }] }).join("\n");
  assert.doesNotMatch(message, /स्वास्थ्य का वादा|Not independently established|\*दावे:\*/u);
});

test("Red Bull response names caffeine and sugar instead of an umbrella caution", () => {
  const message = renderWhatsAppChunks({ language: "en", derived: { items: [{
    position: 1,
    signals: [{ kind: "whole_pack_rda", nutrient: "added_sugars", severity: "high", wholePackAmount: 27, unit: "g", wholePackRdaPercent: 54, printedServingRdaPercent: 54, servingSize: 250, netQuantity: 250, quantityUnit: "ml", basis: "pack_printed_rda" }],
    rating: { score: 7, deductions: [{ ruleId: "engine.whole_pack_rda.added_sugars", points: 3, reason: "High whole-can added sugar." }] },
  }] }, items: [{
    position: 1,
    identity: { nameAsPrinted: "Red Bull Energy Drink", brandAsPrinted: "Red Bull", confidence: "high" },
    summary: "Limit this high-sugar caffeinated drink.",
    profile: [{ label: "CAFFEINATED", evidenceIds: ["ce"] }, { label: "HIGH SUGAR", evidenceIds: ["se"] }],
    findings: [
      { id: "c", kind: "regulatory_context", title: "Caffeine warning", explanation: "75 mg · Avoid for children, pregnancy and caffeine sensitivity.", level: "attention", evidenceIds: ["ce"] },
      { id: "s", kind: "nutrition", topic: "added_sugars", title: "High sugar", explanation: "27 g per 250 ml can.", level: "attention", evidenceIds: ["se"] },
    ],
    evidence: [
      { id: "ce", origin: "package", excerptOrObservation: "Caffeine warning printed." },
      { id: "se", origin: "hosted_web_search", excerptOrObservation: "27 g sugar per can." },
    ],
    webMatchConfidence: "high",
  }] })[0];
  assert.match(message, /^🟠 \*CAFFEINE WARNING\*/u);
  assert.match(message, /🔴 \*HIGH ADDED SUGAR\*\n27 g added sugar · ~54%/u);
  assert.match(message, /\*Rating:\* 7\/10 · 10 − 3 = 7/);
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
    profile: [{ label: "MULTIPLE WARNINGS", evidenceIds: [] }], findings, evidence: [],
  }] })[0];
  for (const [title] of findings.map((finding) => [finding.title])) assert.match(message, new RegExp(title, "iu"));
  assert.ok(Array.from(message).length > 450);
});

test("McVitie's response combines warnings with rating profile verdict and positive analysis", () => {
  const message = renderWhatsAppChunks({ language: "en", derived: { items: [{
    position: 1, signals: [], rating: { score: 6, deductions: [
      { ruleId: "engine.reference_rda.added_sugars", points: 2, reason: "Moderate added sugars." },
      { ruleId: "engine.reference_rda.saturated_fat", points: 2, reason: "Moderate saturated fat." },
    ] },
  }] }, items: [{
    position: 1, identity: { brandAsPrinted: "McVitie's", nameAsPrinted: "Digestive", confidence: "high" },
    webMatchConfidence: "medium",
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
  assert.match(message, /\*Rating:\* 6\/10 · 10 − 2 − 2 = 6/);
  assert.match(message, /\*Profile:\* PALM OIL · WHEAT ALLERGEN · WHOLEWHEAT/);
  assert.match(message, /\*Verdict:\*/);
  assert.match(message, /\*Analysis:\*[\s\S]*WHOLEWHEAT CONTENT/);
  assert.match(message, /\*Claims:\*/);
  assert.match(message, /Nutrition panel is not visible\. — “High in Fibre”/);
  assert.match(message, /“Made with whole wheat” — Online ingredients list refined and whole wheat flour/);
});

test("WhatsApp omits the claims section when no package claim is visible", () => {
  const message = renderWhatsAppChunks({ language: "en", items: [{
    position: 1, identity: { nameAsPrinted: "Plain Product", confidence: "high" },
    profile: [], summary: "No visible marketing claim.", claimsAsPrinted: [], claimAudits: [], findings: [], evidence: [],
  }] })[0];
  assert.doesNotMatch(message, /\*Claims:\*/);
});

test("model-only claim contradiction is amber unless the engine confirms it", () => {
  const baseItem = {
    position: 1, identity: { nameAsPrinted: "Product", confidence: "high" }, profile: [], summary: "Claim checked.",
    claimsAsPrinted: ["No added sugar"],
    claimAudits: [{ claimAsPrinted: "No added sugar", status: "contradicted", assessment: "Matched evidence lists sugar.", evidenceIds: [] }],
    findings: [], evidence: [],
  };
  const modelOnly = renderWhatsAppChunks({ language: "en", items: [baseItem] }).join("\n");
  assert.match(modelOnly, /⚠️ “No added sugar”/u);
  assert.doesNotMatch(modelOnly, /❌ “No added sugar”/u);
  const confirmed = renderWhatsAppChunks({ language: "en", derived: { items: [{ position: 1, rating: { score: 7, deductions: [] }, signals: [{
    kind: "claim_contradiction", severity: "high", testId: "claim.no-added-sugar", claimAsPrinted: "No added sugar", foundIngredient: "sugar", ruleId: "in.fssai.advertising-claims-2018.v1", basis: "literal_package_consistency",
  }] }] }, items: [baseItem] }).join("\n");
  assert.match(confirmed, /❌ “No added sugar”/u);
});

test("WhatsApp defaults renderer headings to English when result language is absent", () => {
  const message = renderWhatsAppChunks({ derived: { items: [{ position: 1, signals: [], rating: { score: null, deductions: [] } }] }, items: [{
    position: 1,
    identity: { nameAsPrinted: "Product", confidence: "high" },
    profile: [{ label: "VEG", evidenceIds: [] }],
    summary: "A concise result.",
    claimsAsPrinted: ["Made with oats"],
    claimAudits: [{ claimAsPrinted: "Made with oats", status: "supported", assessment: "Oats are listed.", evidenceIds: [] }],
    findings: [{ id: "f", kind: "ingredient", title: "Oats listed", explanation: "Oats appear in ingredients.", level: "information", evidenceIds: [] }],
    evidence: [],
  }] })[0];
  assert.doesNotMatch(message, /\*Rating:\*|—\/10/u);
  assert.match(message, /\*Profile:\*/);
  assert.match(message, /\*Verdict:\*/);
  assert.match(message, /\*Analysis:\*/);
  assert.match(message, /\*Claims:\*/);
  assert.doesNotMatch(message, /\*Evidence confidence:\*/);
});

test("multi-product warnings are packed before earlier product detail and none are truncated", () => {
  const longClaims = Array.from({ length: 8 }, (_, index) => `Very long visible claim ${index} ${"detail ".repeat(18)}`);
  const result = {
    language: "en",
    derived: { items: [{ position: 1, signals: [], rating: { score: null, deductions: [] } }, {
      position: 2,
      signals: [{ kind: "whole_pack_rda", nutrient: "added_sugars", severity: "high", wholePackAmount: 40, unit: "g", wholePackRdaPercent: 80, printedServingRdaPercent: 20, servingSize: 100, netQuantity: 400, quantityUnit: "g", basis: "pack_printed_rda" }],
      rating: { score: 7, deductions: [{ ruleId: "engine.whole_pack_rda.added_sugars", points: 3, reason: "High added sugar." }] },
    }] },
    items: [{
      position: 1, identity: { nameAsPrinted: "Verbose Product", confidence: "high" }, profile: [], summary: "First product.",
      claimsAsPrinted: longClaims,
      claimAudits: longClaims.map((claim) => ({ claimAsPrinted: claim, status: "not_assessable", assessment: "More evidence is required.", evidenceIds: [] })),
      findings: [], evidence: [],
    }, {
      position: 2, identity: { nameAsPrinted: "Later Product", confidence: "high" }, profile: [], summary: "Second product.",
      findings: [], evidence: [], claimsAsPrinted: [], claimAudits: [],
    }],
  };
  const chunks = renderWhatsAppChunks(result);
  const complete = chunks.join("\n\n");
  assert.ok(chunks.every((chunk) => Array.from(chunk).length <= 3_500));
  assert.match(complete, /╭─ ⚠️ \*2\/2 · Later Product\*[\s\S]*HIGH ADDED SUGAR[\s\S]*╰────────────────────/u);
  assert.doesNotMatch(complete, /╭─ ⚠️ \*1\/2 · Verbose Product\*/u);
  assert.match(complete, /╭─ 📦 \*1\/2 · Verbose Product(?: · ↪)?\*/u);
  assert.match(complete, /╭─ 📦 \*2\/2 · Later Product\*/u);
  assert.ok(complete.indexOf("╭─ ⚠️") < complete.indexOf("╭─ 📦"));
  assert.ok(complete.indexOf("HIGH ADDED SUGAR") < complete.indexOf("*Claims:*"));
  assert.doesNotMatch(complete, /—\/10/u);
  assert.equal((complete.match(/More evidence is required\./gu) ?? []).length, 8);
  for (const chunk of chunks) {
    assert.equal((chunk.match(/╭─/gu) ?? []).length, (chunk.match(/╰────────────────────/gu) ?? []).length);
  }
});

test("floored rating arithmetic renders max zero honestly", () => {
  const message = renderWhatsAppChunks({ language: "en", derived: { items: [{
    position: 1, signals: [], rating: { score: 0, deductions: [3, 3, 3, 3].map((points, index) => ({ ruleId: `r${index}`, points, reason: "Rule." })) },
  }] }, items: [{ position: 1, identity: { nameAsPrinted: "Product", confidence: "high" }, profile: [], summary: "Result.", findings: [], evidence: [] }] }).join("\n");
  assert.match(message, /max\(0, 10 − 3 − 3 − 3 − 3\) = 0/u);
  assert.doesNotMatch(message, /10 − 3 − 3 − 3 − 3 = 0(?!\))/u);
});

test("successful delivery reads stored output and clears all routing ciphertext", async () => {
  const keyBytes = new Uint8Array(32).fill(9);
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const nonce = new Uint8Array(12).fill(3);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, new TextEncoder().encode("919876543210"));
  let cleaned = false;
  const db = { prepare(sql) { return {
    bind() { return this; },
    async first() { if (!sql.includes("SELECT w.inbound_message_id")) return null; return {
      inbound_message_id: "wamid.image-success==",
      recipient_ciphertext: ciphertext, recipient_nonce: nonce.buffer, status: "ready",
      send_attempts: 0,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      result_json: JSON.stringify({ summary: "Stored result only" }),
    }; },
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
  assert.deepEqual(JSON.parse(calls[0].body).context, { message_id: "wamid.image-success==" });
  assert.equal(cleaned, true);
  assert.equal(acknowledged, true);
});

test("analysis failure notice replies to the originating image", async () => {
  const keyBytes = new Uint8Array(32).fill(10);
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const nonce = new Uint8Array(12).fill(4);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key,
    new TextEncoder().encode("919876543210"));
  const db = { prepare(sql) { return {
    bind() { return this; },
    async first() {
      assert.match(sql, /inbound_message_id/u);
      return { inbound_message_id: "wamid.failed-image==", recipient_ciphertext: ciphertext,
        recipient_nonce: nonce.buffer, language: "en" };
    },
  }; } };
  let payload;
  await sendWhatsAppAnalysisFailure("job", {
    DB: db, DELIVERY_ENCRYPTION_KEY: Buffer.from(keyBytes).toString("base64"), ...config,
  }, async (_url, init) => {
    payload = JSON.parse(init.body);
    return new Response("{}", { status: 200 });
  });
  assert.deepEqual(payload.context, { message_id: "wamid.failed-image==" });
  assert.match(payload.text.body, /couldn't verify this label reliably/i);
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
    async first() { assert.match(sql, /inbound_message_id/u); return {
      inbound_message_id: "wamid.fixture-image==",
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
  const fetcher = async (_url, init) => { sends += 1;
    assert.deepEqual(JSON.parse(init.body).context, { message_id: "wamid.fixture-image==" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response("{}", { status: 200 }); };
  const env = { DB: fixture.db, DELIVERY_ENCRYPTION_KEY: fixture.key, ...config };
  await Promise.all([1, 2].map(() => consumeDelivery({ body: { version: 1, whatsapp_job_id: "job" }, ack() {} }, env, fetcher)));
  assert.equal(sends, 1);
  assert.equal(fixture.state.attempts, 1);
  assert.equal(fixture.state.status, "sent");
  assert.equal(fixture.state.cleared, true);
});

test("out-of-order image results keep every chunk linked to its own inbound image", async () => {
  const keyBytes = new Uint8Array(32).fill(12);
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const nonce = new Uint8Array(12).fill(6);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key,
    new TextEncoder().encode("919876543210"));
  const rows = new Map([
    ["job-A", { inbound: "wamid.image-A==", result: JSON.stringify({ summary: "A".repeat(7_001) }), status: "ready", attempts: 0 }],
    ["job-B", { inbound: "wamid.image-B==", result: JSON.stringify({ summary: "B result" }), status: "ready", attempts: 0 }],
  ]);
  const db = { prepare(sql) { return {
    values: [], bind(...values) { this.values = values; return this; },
    async first() {
      assert.match(sql, /inbound_message_id/u);
      const row = rows.get(String(this.values[0]));
      return row ? { inbound_message_id: row.inbound, recipient_ciphertext: ciphertext,
        recipient_nonce: nonce.buffer, status: row.status, send_attempts: row.attempts,
        expires_at: new Date(Date.now() + 60_000).toISOString(), result_json: row.result } : null;
    },
    async run() {
      if (sql.includes("send_attempts = send_attempts + 1")) {
        const row = rows.get(String(this.values[0]));
        if (!row || row.status !== "ready") return { meta: { changes: 0 } };
        row.status = "processing"; row.attempts += 1; return { meta: { changes: 1 } };
      }
      if (sql.includes("status = 'sent'")) {
        const row = rows.get(String(this.values[1]));
        if (row) row.status = "sent";
        return { meta: { changes: row ? 1 : 0 } };
      }
      if (sql.includes("status = 'failed'")) {
        const row = rows.get(String(this.values[2]));
        if (row) row.status = "failed";
        return { meta: { changes: row ? 1 : 0 } };
      }
      return { meta: { changes: 1 } };
    },
  }; } };
  let releaseA;
  const aGate = new Promise((resolve) => { releaseA = resolve; });
  let enteredA;
  const aEntered = new Promise((resolve) => { enteredA = resolve; });
  const payloads = [];
  let firstA = true;
  const fetcher = async (_url, init) => {
    const payload = JSON.parse(init.body);
    if (payload.context.message_id === "wamid.image-A==" && firstA) {
      firstA = false;
      enteredA();
      await aGate;
    }
    payloads.push(payload);
    return new Response("{}", { status: 200 });
  };
  const env = { DB: db, DELIVERY_ENCRYPTION_KEY: Buffer.from(keyBytes).toString("base64"), ...config };
  const deliveryA = consumeDelivery({ body: { version: 1, whatsapp_job_id: "job-A" }, ack() {} }, env, fetcher);
  await aEntered;
  await consumeDelivery({ body: { version: 1, whatsapp_job_id: "job-B" }, ack() {} }, env, fetcher);
  releaseA();
  await deliveryA;
  assert.deepEqual(payloads.map((payload) => payload.context.message_id), [
    "wamid.image-B==", "wamid.image-A==", "wamid.image-A==", "wamid.image-A==",
  ]);
  assert.ok(payloads.every((payload) => !["job-A", "job-B"].includes(payload.context.message_id)));
  assert.equal(rows.get("job-A").status, "sent");
  assert.equal(rows.get("job-B").status, "sent");
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
