import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  HOME_CANONICAL_URL,
  HOME_METADATA,
  HOME_OG_IMAGE,
  HOME_SHARE_TITLE,
  SITE_ORIGIN,
  WHATSAPP_URL,
} from "../src/site-metadata.ts";

test("homepage share metadata uses absolute production URLs and a large preview card", () => {
  assert.equal(HOME_CANONICAL_URL, `${SITE_ORIGIN}/`);
  assert.equal(HOME_OG_IMAGE.url, `${SITE_ORIGIN}/og.png`);
  assert.equal(HOME_OG_IMAGE.type, "image/png");
  assert.equal(HOME_OG_IMAGE.width, 1200);
  assert.equal(HOME_OG_IMAGE.height, 630);
  assert.match(HOME_SHARE_TITLE, /facts that matter/i);
  assert.match(HOME_OG_IMAGE.alt, /added sugar and sodium/i);
  const serialized = JSON.stringify(HOME_METADATA);
  assert.match(serialized, /summary_large_image/);
  assert.match(serialized, /twitter|added sugar and sodium/i);
  assert.match(serialized, new RegExp(HOME_OG_IMAGE.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("public WhatsApp CTA uses the configured live number", () => {
  assert.equal(WHATSAPP_URL, "https://wa.me/919325835971");
  const homepage = readFileSync(fileURLToPath(new URL("../src/app/page.tsx", import.meta.url)), "utf8");
  const heroEnd = homepage.indexOf("</section>", homepage.indexOf('className="hero"'));
  const aboveFold = homepage.slice(homepage.indexOf('className="site-header"'), heroEnd);
  assert.match(aboveFold, />WhatsApp</);
  assert.match(aboveFold, /Send a product photo/);
  assert.match(aboveFold, /Exact-product web search/);
  assert.doesNotMatch(aboveFold, /Primary channel|How it works|What you get|How we decide/);
  assert.ok((aboveFold.match(/href=\{WHATSAPP_URL\}/g) ?? []).length >= 2);
});

test("committed Open Graph image is a compact 1200 by 630 PNG", () => {
  const path = fileURLToPath(new URL("../public/og.png", import.meta.url));
  const bytes = readFileSync(path);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(bytes.readUInt32BE(16), 1200);
  assert.equal(bytes.readUInt32BE(20), 630);
  assert.ok(bytes.byteLength < 5 * 1024 * 1024);
});
