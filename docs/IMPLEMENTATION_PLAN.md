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
- [x] Add runtime schema validation for the queued provider result, including evidence/rule/service policy and serialized-result size enforcement.
- [x] Add D1 analysis, profile, WhatsApp, delivery, and cleanup repositories plus the exact-attempt provider claim.
- [x] Implement web-device profile identity with an HttpOnly cookie, digest-only D1 identity, and remembered language; local proof persisted English → Urdu across requests.
- [ ] Complete stale-attempt rejection, expiry, and cleanup primitives; the exact provider claim is implemented.
- [x] Apply the D1 migration in the combined local `workerd` environment and exercise analysis persistence; broader repository tests remain.

Exit proof: a language set once is recovered on the next local request, and Queue redelivery cannot claim an already-started provider attempt.

### Phase 3 — Web intake and the one-call Terra analyzer

State: IN PROGRESS — the local queued miss-to-result and exact-image cache-hit foundation is verified; production hardening remains

Tasks:

- [x] Validate supported input type, 12 MB input size, decoded dimensions/pixel count, and one-to-six product contract.
- [x] Preserve original encoded bytes and pixel dimensions after Cloudflare Images decode validation; hash the original validated bytes without lossy re-encoding.
- [x] Store temporary media in the simulated private R2 binding and enqueue identifiers plus attempt number only in the combined local runtime.
- [x] Implement the direct, Jobs-only `gpt-5.6-terra` Responses client with image input, strict structured output, and optional hosted web search inside the same request.
- [x] Prove the client with a live synthetic smoke on 2026-08-23: one Responses request completed successfully with web search disabled.
- [x] Enforce no automatic provider retry; another provider call requires an explicit new attempt.
- [x] Validate the returned evidence graph, provider citation ID+URL pairs, allow-listed coverage/service IDs, prohibited wording, and serialized size against the wired FSSAI, Legal Metrology, CDSCO, experimental INR, FoSCoS, BIS Care, and NCH packs.
- [x] Persist a validated provider result, protect polling with a per-scan 256-bit capability whose digest alone is stored, and render the consumer result.
- [x] Present a short consumer card with three priority findings, one claim check, next action, and expandable evidence; WhatsApp uses the same concise hierarchy.
- [x] Implement versioned exact-image cache identity and prove an authorized zero-call cache hit; production version-pack coverage remains.
- [x] Wire explicit user resubmission to a new durable attempt with fresh normalized media; never automatically repeat a provider-started call.

Current proof (2026-08-23): local and production runs validate encoded dimensions while preserving original bytes. Production has proved one-call analysis, capability polling, cache hits, profiles and live WhatsApp delivery. Prompt v7 transcribes structured nutrition, exact printed claims and ingredient tokens; decision-engine v1 derives whole-pack impact and conservative literal package contradictions. An exact Haldiram's front-only fixture proved automatic hosted search, official product-page matching, provider-source validation and provisional online evidence in the same Terra response. `/how-we-decide` exposes formulas, thresholds, tests and sources. Instant cached shampoo, chips and six-product demonstrations are labelled and make zero model calls.

Exit proof: instrumentation proves zero Terra calls on a fresh cache hit and exactly one on a cache miss.

### Phase 4 — Direct WhatsApp channel

State: LOCAL IMPLEMENTATION DONE; live Meta end-to-end BLOCKED until legacy credential rotation and test credentials are supplied

Tasks:

- [x] Implement and test GET challenge-token verification and POST raw-body HMAC verification on `/api/whatsapp`.
- [x] Persist inbound events idempotently in D1 and publish ID-only Queue messages before acknowledgement.
- [x] Fetch media through fixed Meta Graph endpoints with mocked clients and type/size validation.
- [x] Encrypt short-lived recipient/media routing values in D1.
- [x] Reuse the analysis contracts and persistent language profile, including 12-language text commands.
- [x] Render stored WhatsApp-safe output and retry Graph delivery independently from semantic analysis.
- [x] Clear encrypted routing fields and temporary media through terminal cleanup paths.

Pre-deploy gate: the transport is implemented and covered with mocked Graph clients. Do not configure the production Meta callback until the exposed predecessor credential is rotated and a real Meta test-number flow proves signature, media retrieval, replay safety, delivery, and cleanup.

Exit proof: forged signatures fail; valid events are durably recorded and acknowledged only after Queue dispatch; webhook replay and Queue redelivery cause zero duplicate Terra calls; a real image receives the localized stored result.

### Phase 5 — Public-service and operational surfaces

State: IN PROGRESS — registry and grievance minimums are complete; officer release-fixture depth and operations remain

Tasks:

- [x] Add allow-listed FoSCoS, BIS Care, and NCH service routes to the analyzer and validator.
- [x] Add exact synthetic registry checks only; no fuzzy or live-government lookup claim.
- [x] Add an editable local grievance draft with no automatic submission or fake docket.
- [x] Add the protected minimum officer aggregate dashboard; richer release-fixture filters/drill-down remain.
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

State: IN PROGRESS — both Workers and all Cloudflare resources are live; Meta/officer credentials and final release rehearsal remain

Tasks:

- [x] Run `wrangler login` and confirm the intended Cloudflare account.
- [ ] Confirm Workers Paid/Standard coverage; startup credits alone do not prove plan activation.
- [x] Create D1, private R2, Analysis Queue, Delivery Queue, and their DLQs.
- [ ] Apply remote migrations, lifecycle backstop, bindings, and scoped production secrets. D1 migrations, lifecycle, OpenAI/profile/encryption/session secrets are complete; Meta/officer demo credentials remain.
- [x] Deploy Jobs Worker, then public OpenNext Worker to `workers.dev`.
- [ ] Verify public TLS, Meta webhook reachability, cleanup, logs, and end-to-end journeys. Public TLS and production web scan/cache pass; live Meta remains.
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

1. Run Cloudflare Images through `wrangler dev --remote` and verify high-fidelity normalization against real multi-product fixtures.
2. Complete stale/redelivery, retention, maximum-memory, secret-scan, and deployment-oriented audit gates.
3. Rehearse registry, grievance, and officer surfaces with release fixtures and finish operational/audit evidence.
4. Rotate the legacy Meta credential, configure a test number, and run the real WhatsApp image/replay/delivery journey.
5. Replace placeholder Cloudflare resource IDs, configure scoped production secrets, migrate remote D1, and deploy only after the remaining gates pass.
