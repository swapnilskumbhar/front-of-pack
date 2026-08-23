import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  parseWhatsAppEvents,
  verifyMetaSignature,
  verifySubscription,
} from "../src/channels/whatsapp/webhook.ts";

test("subscription verification requires subscribe mode and matching token", () => {
  const valid = new URL(
    "https://example.test/api/whatsapp?hub.mode=subscribe&hub.verify_token=secret&hub.challenge=1234",
  );
  assert.deepEqual(verifySubscription(valid, "secret"), {
    ok: true,
    challenge: "1234",
  });

  valid.searchParams.set("hub.verify_token", "wrong");
  assert.deepEqual(verifySubscription(valid, "secret"), { ok: false });
});

test("signature verification authenticates the exact raw bytes", async () => {
  const raw = new TextEncoder().encode('{"hello":"world"}');
  const signature = createHmac("sha256", "app-secret").update(raw).digest("hex");

  assert.equal(
    await verifyMetaSignature(raw.buffer, `sha256=${signature}`, "app-secret"),
    true,
  );
  assert.equal(
    await verifyMetaSignature(
      new TextEncoder().encode('{"hello": "world"}').buffer,
      `sha256=${signature}`,
      "app-secret",
    ),
    false,
  );
  assert.equal(await verifyMetaSignature(raw.buffer, "sha256=bad", "app-secret"), false);
  assert.equal(await verifyMetaSignature(raw.buffer, null, "app-secret"), false);
});

test("parser walks every entry, change, message, and status", () => {
  const events = parseWhatsAppEvents({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-1" },
              messages: [
                {
                  id: "message-1",
                  from: "sender-1",
                  timestamp: "10",
                  type: "image",
                  image: { id: "media-1", mime_type: "image/jpeg", caption: "front" },
                },
                {
                  id: "message-2",
                  from: "sender-1",
                  type: "text",
                  text: { body: "हिन्दी" },
                },
                { id: "message-3", from: "sender-1", type: "location" },
              ],
              statuses: [
                {
                  id: "outbound-1",
                  status: "delivered",
                  timestamp: "11",
                  recipient_id: "recipient-1",
                },
              ],
            },
          },
        ],
      },
    ],
  });

  assert.equal(events?.length, 4);
  assert.equal(events?.[0]?.kind, "image");
  assert.equal(events?.[1]?.kind, "text");
  assert.equal(events?.[2]?.kind, "unsupported");
  assert.equal(events?.[3]?.kind, "status");
});

test("parser rejects unrelated webhook objects and tolerates malformed batches", () => {
  assert.equal(parseWhatsAppEvents({ object: "page", entry: [] }), null);
  assert.deepEqual(
    parseWhatsAppEvents({ object: "whatsapp_business_account", entry: [{ changes: null }] }),
    [],
  );
});
