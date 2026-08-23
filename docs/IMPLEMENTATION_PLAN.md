# Front of Pack — Phasewise Implementation Plan

Status date: 2026-08-23
Execution order: local first, Cloudflare deployment last
Design authority: `HLD.md` and `LLD.md`

## 1. Non-negotiable product constraints

- One uploaded image may contain one to six packaged products.
- A fresh analysis uses exactly one `gpt-5.6-terra` Responses API request.
- Hosted web search may run inside that same response when names or evidence need it.
- A fresh cache hit uses zero model calls.
- Terra owns extraction, identification, regulatory reasoning, findings, claim review, and localized explanation.
- Application code validates schema, citations, evidence references, coverage, and permitted wording. It does not semantically repair or paraphrase Terra.
- Web and WhatsApp are must-have consumer channels. The chosen language is saved once per channel profile.
- Food/FSSAI is the competition hero. Cosmetics, personal care, household, baby, pet, and supplements are supported only to the verified coverage available for each category.
- Registry, officer, and editable grievance-draft surfaces are required. The product never submits a grievance for the user.
- New deployment is Cloudflare-native. The legacy n8n workflow is predecessor/security evidence only.

## 2. Secret handling

Never paste a real secret into chat, a committed file, an issue, a screenshot, or a pull request.

### First key to create

Create a fresh, project-scoped OpenAI API key with a deliberate spend limit. Keep it in your password manager for now. The implementation does not need the key until the Jobs Worker reaches the local Terra integration task in Phase 3.

When `workers/jobs/` exists, the local value goes in:

```text
workers/jobs/.dev.vars
```

```dotenv
OPENAI_API_KEY="paste-the-real-key-locally"
```

That file is ignored by Git. The OpenAI key must never be bound to the public OpenNext web Worker.

For the deployed Jobs Worker, set it interactively after Wrangler login:

```powershell
npx wrangler secret put OPENAI_API_KEY --config workers/jobs/wrangler.jsonc
```

### Secret ownership by phase

| Secret/configuration | Local owner | Production owner | Needed |
|---|---|---|---|
| `OPENAI_API_KEY` | `workers/jobs/.dev.vars` | Jobs Worker secret | Phase 3 |
| `META_VERIFY_TOKEN` | root `.dev.vars` | Public web Worker secret | Phase 4 |
| `META_APP_SECRET` | root `.dev.vars` | Public web Worker secret | Phase 4 |
| `META_ACCESS_TOKEN` | `workers/jobs/.dev.vars` | Jobs Worker secret | Phase 4 |
| `META_PHONE_NUMBER_ID` | Jobs local config | Jobs Worker variable or secret | Phase 4 |
| `PROFILE_HMAC_KEY` | only Workers that derive profile digests | corresponding Worker secrets | Phase 2/4 |
| `ROUTING_ENCRYPTION_KEY` | web + Jobs local secret files | both Worker secrets | Phase 4 |
| `OFFICER_SESSION_SECRET` | root `.dev.vars` | Public web Worker secret | Phase 5 |
| Cloudflare login | Wrangler OAuth outside the repo | Wrangler OAuth; CI token later if used | Phase 7 |

D1 IDs, R2 bucket names, Queue names, Worker names, public URLs, and the domain are bindings/configuration—not secrets. Do not create Meta secrets until Phase 4. Do not create Cloudflare production secrets until the matching code passes locally.

## 3. Phase ledger

### Phase 0 — Security, repository, and execution baseline

State: IN PROGRESS

Tasks:

- [x] Initialize Git on `main`, connect `origin`, and push the documentation baseline.
- [x] Record baseline commit `914ad7dc0ab57f13a0259417065052efb47d9ea4`.
- [x] Lock the Cloudflare-native HLD/LLD and one-call Terra boundary.
- [x] Add ignored secret/environment patterns.
- [ ] Revoke and rotate the Meta token exposed by the legacy n8n export; keep the old workflow disabled.
- [x] Configure the project-scoped OpenAI key in the ignored Jobs Worker `.dev.vars`; never expose it to the public Worker or repository.
- [x] Reconcile Git/GitHub and scaffold-status markers in the execution/setup documents.

Exit proof: clean secret scan, legacy-token incident closed, and a documented before/during-competition boundary.

### Phase 1 — OpenNext foundation and local workflow

State: IN PROGRESS

Tasks:

- [x] Generate a Next.js 16 App Router foundation without deploying it.
- [x] Install `@opennextjs/cloudflare` and Wrangler.
- [x] Add initial OpenNext and public Worker configuration.
- [x] Install locked dependencies locally.
- [ ] Finish scripts, required ignores, Cloudflare type generation, and project README.
- [ ] Apply the drafted mobile-first consumer UI shell.
- [ ] Remove temporary scaffold leakage from lint and TypeScript scope.
- [ ] Pass lint, typecheck, Next production build, and OpenNext `workerd` preview.

Exit proof: the public app renders locally in both `next dev` and OpenNext preview, with no Cloudflare account or production secret required.

### Phase 2 — Contracts, D1, profiles, language, and lifecycle

State: IN PROGRESS

Tasks:

- [x] Define 12-language, profile, analysis, cache, product, evidence, citation, coverage, and Queue contracts.
- [x] Add the initial D1-compatible SQLite migration.
- [x] Add runtime schema validation for the queued provider result; full evidence/rule/service policy validation and serialized-result size enforcement remain.
- [x] Add the D1 analysis repository and exact-attempt provider claim; profile and cleanup repositories remain.
- [ ] Implement web-device profile identity and remembered language.
- [ ] Complete stale-attempt rejection, expiry, and cleanup primitives; the exact provider claim is implemented.
- [x] Apply the D1 migration in the combined local `workerd` environment and exercise analysis persistence; broader repository tests remain.

Exit proof: a language set once is recovered on the next local request, and Queue redelivery cannot claim an already-started provider attempt.

### Phase 3 — Web intake and the one-call Terra analyzer

State: IN PROGRESS — the local queued miss-to-result and exact-image cache-hit foundation is verified; production hardening remains

Tasks:

- [ ] Complete image validation for supported MIME, 12 MB cap, dimensions, and one-to-six product contract; current intake performs only foundational checks.
- [ ] Normalize metadata safely in the Workers runtime and compute a canonical image hash.
- [x] Store temporary media in the simulated private R2 binding and enqueue identifiers plus attempt number only in the combined local runtime.
- [x] Implement the direct, Jobs-only `gpt-5.6-terra` Responses client with image input, strict structured output, and optional hosted web search inside the same request.
- [x] Prove the client with a live synthetic smoke on 2026-08-23: one Responses request completed successfully with web search disabled.
- [x] Enforce no automatic provider retry; another provider call requires an explicit new attempt.
- [x] Validate the returned evidence graph, provider citation ID+URL pairs, allow-listed coverage/service IDs, prohibited wording, and serialized size; real rule/service packs remain.
- [x] Persist a validated provider result, protect polling with a per-scan 256-bit capability whose digest alone is stored, and render the consumer result.
- [x] Implement versioned exact-image cache identity and prove an authorized zero-call cache hit; production version-pack coverage remains.
- [ ] Wire explicit retry to durable attempt state; never automatically repeat a provider-started call.

Current proof (2026-08-23): combined multi-config local `workerd` runs used simulated D1, R2, and Queue bindings. A fresh upload returned `202`, made exactly one Terra request, persisted the completed result, and returned it through capability-authorized polling. Polling without the capability returned `404`. The identical image/language then returned HTTP `200` from cache without another Queue job. Tests stand at 21 root and 12 Jobs Worker cases. A deliberately corrupt PNG-signature fixture also persisted the provider failure path. This is a verified local foundation, not deployment readiness.

Exit proof: instrumentation proves zero Terra calls on a fresh cache hit and exactly one on a cache miss.

### Phase 4 — Direct WhatsApp channel

State: ENDPOINT FOUNDATION DONE; full channel BLOCKED until legacy Meta credential rotation and durable intake/delivery wiring are complete

Tasks:

- [x] Implement and test GET challenge-token verification and POST raw-body HMAC verification on `/api/whatsapp`.
- [ ] Replace the intentional signed-POST `503` response with durable D1 deduplication plus Queue dispatch before deployment.
- [ ] Acknowledge quickly, deduplicate every inbound message ID, and enqueue IDs only.
- [ ] Fetch media using fixed Meta Graph endpoints and validate type/size.
- [ ] Encrypt short-lived recipient/media routing values in D1.
- [ ] Reuse the same analysis contracts and saved language preference.
- [ ] Render WhatsApp-safe output and retry delivery independently from semantic analysis.
- [ ] Clear encrypted routing fields and temporary media after terminal processing.

Pre-deploy gate: signed POST currently returns `503` intentionally so Meta cannot receive a false acknowledgement before durable D1 and Queue dispatch exist. Do not configure the production Meta callback until this gate is complete.

Exit proof: forged signatures fail; valid events are durably recorded and acknowledged only after Queue dispatch; webhook replay and Queue redelivery cause zero duplicate Terra calls; a real image receives the localized stored result.

### Phase 5 — Public-service and operational surfaces

State: TODO

Tasks:

- [ ] Add allow-listed FSSAI/FoSCoS, BIS Care, and NCH service routes.
- [ ] Add exact registry checks only where the identifier and service support them.
- [ ] Add an editable grievance draft with no automatic submission or fake docket.
- [ ] Add the minimum officer dashboard with evidence, filters, aggregation, and drill-down.
- [ ] Add audit events, redacted logs, metrics, cost counters, and hourly cleanup.
- [ ] Enforce honest category coverage and non-official experimental FOP wording.

Exit proof: all three minimum surfaces work locally and never claim government endorsement, legal status, medical safety, or automatic submission.

### Phase 6 — Local quality, security, and demo gates

State: TODO

Tasks:

- [ ] Test maximum image memory in `workerd` and the compressed Worker bundle.
- [ ] Test D1 migrations, 512 KiB persisted-analysis cap, Queue redelivery, stale attempts, and cleanup.
- [ ] Test multilingual golden cases, multi-product cases, unclear-label retakes, and unsupported-category limits.
- [ ] Test raw-body signatures, SSRF boundaries, webhook replay, PII redaction, and secret scanning.
- [ ] Rehearse web, WhatsApp, registry, officer, and grievance-demo journeys with offline fallbacks.

Exit proof: local gates G1–G5 pass and the demo can be repeated from a clean checkout with documented setup.

### Phase 7 — Cloudflare provisioning and release

State: BLOCKED until local gates pass and user completes interactive account steps

Tasks:

- [ ] Run `wrangler login` and confirm the intended Cloudflare account.
- [ ] Confirm Workers Paid/Standard coverage; startup credits alone do not prove plan activation.
- [ ] Create D1, private R2, Analysis Queue, Delivery Queue, and their DLQs.
- [ ] Apply remote migrations, lifecycle backstop, bindings, and scoped production secrets.
- [ ] Deploy Jobs Worker, then public OpenNext Worker to `workers.dev`.
- [ ] Verify public TLS, Meta webhook reachability, cleanup, logs, and end-to-end journeys.
- [ ] Add a custom domain only after the `workers.dev` release passes and the exact purchase is approved.
- [ ] Push the verified release commit and preserve submission evidence.

Exit proof: public gate G6 passes on the judge-visible URL; Cloudflare Access does not block judges or Meta.

## 4. Parallel execution batches

After Phase 1 is green, implementation should remain split into non-overlapping subagent ownership:

1. Platform agent: Worker configurations, bindings, local preview, and build gates.
2. Data agent: D1 migrations, repositories, profiles, language, lifecycle, and idempotency.
3. Analysis agent: Terra request contract, prompt, validator, cache, and eval fixtures.
4. Channel/UI agents in the next batch: consumer UI/upload/results; direct WhatsApp; registry/officer/grievance.

No agent deploys, purchases a domain, creates paid resources, or receives a real secret. Deployment is a separate user-gated phase after local acceptance.

## 5. Immediate next tasks

1. Harden web intake with Workers-safe normalization/EXIF removal, complete MIME/dimension/size checks, and canonical hashing.
2. Add durable browser profile/language persistence; capability-authorized result polling is implemented.
3. Complete evidence/rule/service validation, real verified packs, stale/redelivery assertions, delivery publishing, and cleanup coverage.
4. Persist browser and WhatsApp language preferences through the D1 profile repositories.
5. Wire `/api/whatsapp` signed POST to encrypted D1 deduplication and ID-only Queue dispatch before Meta configuration or deployment.
6. Keep Cloudflare production resources, production secrets, and deployment blocked until the local gates pass; keep the full WhatsApp channel blocked until the legacy Meta credential rotation is confirmed.
