# Front of Pack Jobs Worker

Private Cloudflare Worker shell for asynchronous analysis and delivery work.
It consumes two logical queues in one Worker:

- `front-of-pack-analysis`: one message per batch to protect the single-provider-call invariant.
- `front-of-pack-delivery`: delivery retries only; it must never invoke the model.

Queue bodies contain identifiers and an attempt number only. Images, personal
data, ciphertext, model output, and secrets must never be placed on a queue.

## Local setup

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Add a newly created OpenAI API key to `.dev.vars` only when provider work is implemented.
3. Install dependencies with `npm install` from this directory.
4. Run `npm run dev`, then request `GET /health`.

Both consumers are implemented and deployed. Analysis is conditionally claimed
before the single provider call; delivery reads only stored output, emits
closed numbered product blocks, and replies every chunk to the originating
image with Meta `context.message_id`. Delivery retries only before any chunk
has been sent, preventing duplicate partial responses.

Production D1, R2, Queue/DLQ bindings, and their generated IDs are provisioned
later. Store `OPENAI_API_KEY` as a secret on this Jobs Worker only—for example,
with `npx wrangler secret put OPENAI_API_KEY`. Never commit `.dev.vars`, never
place a real key in `.dev.vars.example`, and never bind this secret to the
public web/API Worker.

Deploy with `npm run deploy` only after the worker tests and typecheck pass.
