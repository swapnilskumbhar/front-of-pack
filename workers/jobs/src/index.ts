export interface AnalysisQueueMessage {
  analysisId: string;
  attemptNumber: number;
}

export interface DeliveryQueueMessage {
  whatsappJobId: string;
  attemptNumber: number;
}

export interface Env {
  ENVIRONMENT: string;
  // Configure only as a Jobs Worker secret. It is intentionally unused until
  // the provider integration phase.
  OPENAI_API_KEY?: string;
}

function isQueueMessage(
  value: unknown,
  idKey: "analysisId" | "whatsappJobId",
): value is Record<typeof idKey, string> & { attemptNumber: number } {
  if (typeof value !== "object" || value === null) return false;

  const message = value as Record<string, unknown>;
  return (
    typeof message[idKey] === "string" &&
    message[idKey].length > 0 &&
    Number.isInteger(message.attemptNumber) &&
    (message.attemptNumber as number) > 0 &&
    Object.keys(message).every(
      (key) => key === idKey || key === "attemptNumber",
    )
  );
}

async function consumeAnalysis(
  message: Message<unknown>,
): Promise<void> {
  if (!isQueueMessage(message.body, "analysisId")) {
    throw new Error("Invalid analysis queue message");
  }

  // Provider execution, conditional D1 claiming, and result persistence are
  // added in a later phase. Throwing prevents this shell from silently losing
  // work if a queue is accidentally connected early.
  throw new Error("Analysis processing is not implemented");
}

async function consumeDelivery(
  message: Message<unknown>,
): Promise<void> {
  if (!isQueueMessage(message.body, "whatsappJobId")) {
    throw new Error("Invalid delivery queue message");
  }

  throw new Error("Delivery processing is not implemented");
}

export default {
  fetch(request: Request, env: Env): Response {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        service: "front-of-pack-jobs",
        status: "ok",
        environment: env.ENVIRONMENT,
        providerConfigured: Boolean(env.OPENAI_API_KEY),
      });
    }

    return new Response("Not Found", { status: 404 });
  },

  async queue(batch: MessageBatch<unknown>): Promise<void> {
    for (const message of batch.messages) {
      if (batch.queue === "front-of-pack-analysis") {
        await consumeAnalysis(message);
      } else if (batch.queue === "front-of-pack-delivery") {
        await consumeDelivery(message);
      } else {
        throw new Error(`Unsupported queue: ${batch.queue}`);
      }
    }
  },
} satisfies ExportedHandler<Env>;
