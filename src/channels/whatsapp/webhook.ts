export type WhatsAppEvent =
  | {
      kind: "image";
      messageId: string;
      sender: string;
      phoneNumberId: string;
      timestamp?: string;
      mediaId: string;
      mimeType?: string;
      caption?: string;
    }
  | {
      kind: "text";
      messageId: string;
      sender: string;
      phoneNumberId: string;
      timestamp?: string;
      text: string;
    }
  | {
      kind: "unsupported";
      messageId: string;
      sender: string;
      phoneNumberId: string;
      timestamp?: string;
      messageType: string;
    }
  | {
      kind: "status";
      messageId: string;
      phoneNumberId: string;
      status: string;
      timestamp?: string;
      recipient?: string;
    };

export type DispatchResult =
  | { accepted: true }
  | { accepted: false; reason: "persistence_and_enqueue_not_configured" };

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : undefined;
}

function string(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value)
    ? value.map(record).filter((item): item is UnknownRecord => item !== undefined)
    : [];
}

export function parseWhatsAppEvents(payload: unknown): WhatsAppEvent[] | null {
  const root = record(payload);
  if (!root || root.object !== "whatsapp_business_account") return null;

  const events: WhatsAppEvent[] = [];

  for (const entry of records(root.entry)) {
    for (const change of records(entry.changes)) {
      if (change.field !== "messages") continue;
      const value = record(change.value);
      const metadata = record(value?.metadata);
      const phoneNumberId = string(metadata?.phone_number_id);
      if (!value || !phoneNumberId) continue;

      for (const message of records(value.messages)) {
        const messageId = string(message.id);
        const sender = string(message.from);
        const messageType = string(message.type);
        if (!messageId || !sender || !messageType) continue;

        const common = {
          messageId,
          sender,
          phoneNumberId,
          timestamp: string(message.timestamp),
        };

        if (messageType === "image") {
          const image = record(message.image);
          const mediaId = string(image?.id);
          if (!mediaId) continue;
          events.push({
            ...common,
            kind: "image",
            mediaId,
            mimeType: string(image?.mime_type),
            caption: string(image?.caption),
          });
        } else if (messageType === "text") {
          const text = string(record(message.text)?.body);
          if (text === undefined) continue;
          events.push({ ...common, kind: "text", text });
        } else {
          events.push({ ...common, kind: "unsupported", messageType });
        }
      }

      for (const status of records(value.statuses)) {
        const messageId = string(status.id);
        const statusValue = string(status.status);
        if (!messageId || !statusValue) continue;
        events.push({
          kind: "status",
          messageId,
          phoneNumberId,
          status: statusValue,
          timestamp: string(status.timestamp),
          recipient: string(status.recipient_id),
        });
      }
    }
  }

  return events;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeHexEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function constantTimeStringEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

export async function verifyMetaSignature(
  rawBody: ArrayBuffer,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!appSecret || !signatureHeader) return false;
  const match = /^sha256=([0-9a-fA-F]{64})$/.exec(signatureHeader);
  if (!match) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, rawBody);
  return constantTimeHexEqual(bytesToHex(new Uint8Array(digest)), match[1].toLowerCase());
}

export function verifySubscription(
  url: URL,
  expectedToken: string,
): { ok: true; challenge: string } | { ok: false } {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  return mode === "subscribe" && token !== null && constantTimeStringEqual(token, expectedToken) && challenge !== null
    ? { ok: true, challenge }
    : { ok: false };
}

/**
 * Production wiring seam. It must atomically persist/enqueue events before it
 * may return accepted. Returning false makes the webhook fail visibly instead
 * of acknowledging work that would be lost.
 */
export async function dispatchWhatsAppEvents(
  events: readonly WhatsAppEvent[],
): Promise<DispatchResult> {
  void events;
  return { accepted: false, reason: "persistence_and_enqueue_not_configured" };
}
