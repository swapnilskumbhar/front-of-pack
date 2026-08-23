import { getWhatsAppSecrets } from "@/channels/whatsapp/env";
import {
  parseWhatsAppEvents,
  verifyMetaSignature,
  verifySubscription,
} from "@/channels/whatsapp/webhook";
import { persistAndEnqueueWhatsAppEvents, type WhatsAppIntakeBindings } from "@/channels/whatsapp/intake";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "cache-control": "no-store" };

export async function GET(request: Request): Promise<Response> {
  const { verifyToken } = await getWhatsAppSecrets();
  if (!verifyToken) {
    console.warn("whatsapp_webhook_rejected", { reason: "verify_token_missing" });
    return Response.json(
      { error: "webhook_not_configured" },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const verification = verifySubscription(new URL(request.url), verifyToken);
  if (!verification.ok) {
    console.warn("whatsapp_webhook_rejected", { reason: "subscription_verification_failed" });
    return new Response("Forbidden", { status: 403, headers: noStoreHeaders });
  }

  return new Response(verification.challenge, { status: 200, headers: noStoreHeaders });
}

export async function POST(request: Request): Promise<Response> {
  const { appSecret, env } = await getWhatsAppSecrets();
  if (!appSecret) {
    console.warn("whatsapp_webhook_rejected", { reason: "app_secret_missing" });
    return Response.json(
      { error: "webhook_not_configured" },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const rawBody = await request.arrayBuffer();
  const signatureIsValid = await verifyMetaSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    appSecret,
  );
  if (!signatureIsValid) {
    console.warn("whatsapp_webhook_rejected", { reason: "signature_invalid" });
    return new Response("Unauthorized", { status: 401, headers: noStoreHeaders });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    console.warn("whatsapp_webhook_rejected", { reason: "invalid_json" });
    return Response.json(
      { error: "invalid_json" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const events = parseWhatsAppEvents(payload);
  if (events === null) {
    console.warn("whatsapp_webhook_rejected", { reason: "unsupported_webhook_object" });
    return Response.json(
      { error: "unsupported_webhook_object" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const bindings = env as unknown as Partial<WhatsAppIntakeBindings> | undefined;
  if (!bindings?.DB || !bindings.ANALYSIS_QUEUE || !bindings.PROFILE_HMAC_SECRET || !bindings.DELIVERY_ENCRYPTION_KEY) {
    console.warn("whatsapp_webhook_rejected", { reason: "durable_bindings_missing" });
    return Response.json(
      { error: "persistence_and_enqueue_not_configured" },
      { status: 503, headers: noStoreHeaders },
    );
  }

  try {
    await persistAndEnqueueWhatsAppEvents(events, bindings as WhatsAppIntakeBindings);
  } catch (cause) {
    console.warn("whatsapp_webhook_rejected", {
      reason: "durable_intake_failed",
      code: cause instanceof Error ? cause.message : "unknown",
    });
    return Response.json({ error: "durable_intake_failed" }, { status: 503, headers: noStoreHeaders });
  }

  console.info("whatsapp_webhook_accepted", {
    imageEvents: events.filter((event) => event.kind === "image").length,
    textEvents: events.filter((event) => event.kind === "text").length,
    statusEvents: events.filter((event) => event.kind === "status").length,
    unsupportedEvents: events.filter((event) => event.kind === "unsupported").length,
  });

  return Response.json({ received: true }, { status: 200, headers: noStoreHeaders });
}
