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

The current consumers intentionally fail rather than acknowledge messages: no
analysis or delivery implementation exists yet. Do not connect production
queues until conditional D1 claims, persistence, and explicit retry semantics
are implemented and tested.

Production D1, R2, Queue/DLQ bindings, and their generated IDs are provisioned
later. Store `OPENAI_API_KEY` as a secret on this Jobs Worker only—for example,
with `npx wrangler secret put OPENAI_API_KEY`. Never commit `.dev.vars`, never
place a real key in `.dev.vars.example`, and never bind this secret to the
public web/API Worker.

Deployment is intentionally not part of this shell task.
