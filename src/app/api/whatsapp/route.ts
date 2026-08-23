import { getWhatsAppSecrets } from "@/channels/whatsapp/env";
import {
  dispatchWhatsAppEvents,
  parseWhatsAppEvents,
  verifyMetaSignature,
  verifySubscription,
} from "@/channels/whatsapp/webhook";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "cache-control": "no-store" };

export async function GET(request: Request): Promise<Response> {
  const { verifyToken } = await getWhatsAppSecrets();
  if (!verifyToken) {
    return Response.json(
      { error: "webhook_not_configured" },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const verification = verifySubscription(new URL(request.url), verifyToken);
  if (!verification.ok) {
    return new Response("Forbidden", { status: 403, headers: noStoreHeaders });
  }

  return new Response(verification.challenge, { status: 200, headers: noStoreHeaders });
}

export async function POST(request: Request): Promise<Response> {
  const { appSecret } = await getWhatsAppSecrets();
  if (!appSecret) {
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
    return new Response("Unauthorized", { status: 401, headers: noStoreHeaders });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return Response.json(
      { error: "invalid_json" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const events = parseWhatsAppEvents(payload);
  if (events === null) {
    return Response.json(
      { error: "unsupported_webhook_object" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const dispatch = await dispatchWhatsAppEvents(events);
  if (!dispatch.accepted) {
    return Response.json(
      { error: dispatch.reason },
      { status: 503, headers: noStoreHeaders },
    );
  }

  return Response.json({ received: true }, { status: 200, headers: noStoreHeaders });
}
