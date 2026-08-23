# Front of Pack — Execution Pipeline

> **Status:** ACTIVE operational source of truth
> **Created:** 23 August 2026
> **Deadline:** 28 August 2026, 8:00 PM IST
> **Submission target:** 28 August 2026, 12:00 PM IST
> **Current implementation state:** combined local `workerd` runs have verified the capability-authorized queued web analysis miss-to-result and exact-image cache-hit foundation with simulated D1/R2/Queues; production image normalization, verified rule/service packs, durable WhatsApp/Graph delivery, and Cloudflare provisioning remain; no Cloudflare deployment exists yet
> **Scope authority:** [FINAL_PLAN.md](./FINAL_PLAN.md)
> **Architecture:** [HLD.md](./HLD.md)
> **Implementation contract:** [LLD.md](./LLD.md)
> **Cloudflare onboarding:** [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)
> **Retired:** Front of Pack Playbook

This document turns the strategy into a build pipeline. It owns live task status, dependencies, gates, proof, and reuse records. It does not silently change product scope or architecture.

---

## 1. How to use this document

Every implementation session must:

1. Read the current gate and task register.
2. Select only a READY task whose dependencies are DONE.
3. Mark exactly one task IN_PROGRESS.
4. Make the smallest change that produces the named output.
5. Run the acceptance check.
6. Save the named proof artifact without secrets or personal data.
7. Update the reuse ledger if predecessor material was touched.
8. Mark DONE only when the proof exists.
9. Commit the completed unit after Git is initialized.
10. Stop and reconcile the documents if implementation requires an architectural or scope change.

Allowed task states:

| State | Meaning |
|---|---|
| TODO | Dependency or prerequisite is unfinished |
| READY | All dependencies are complete |
| IN_PROGRESS | The one task currently being implemented |
| BLOCKED_USER | Requires a credential, account action, ownership decision, or other user-only action |
| BLOCKED_EXTERNAL | Depends on provider approval or unavailable external state |
| FAILED | Acceptance check failed; failure proof and next action recorded |
| DONE | Output and redacted proof both exist |
| CUT | Removed under the documented cut order |

A verbal claim, screenshot without context, or successful demo once is not proof.

---

## 2. Observed predecessor baseline

### 2.1 Sources audited read-only

| Source | Verified identifier | Observed role |
|---|---|---|
| E:\projects\labelsensei | Git HEAD 22d1cb339913c08b0fbd5f2a454935df792b09d1 | Static LabelSensei marketing site |
| D:\Wedding Video\whatsapp_workflow (2).json | SHA-256 B222D5993F267A272FF400394A01FC9E373E3D2D70DB788376AB6753C54E8B19 | Active-marked n8n WhatsApp/Gemini workflow |
| E:\projects\front-of-pack | Baseline commit 914ad7dc0ab57f13a0259417065052efb47d9ea4 on `main`, pushed to `origin/main` | New hackathon repository; the baseline commit contains documentation and `.gitignore` only |

The path originally supplied for the n8n export did not exist exactly. The audited file is directly under D:\Wedding Video and has no leading underscore.

Do not copy the raw n8n export into Front of Pack. It contains credential material and is not a safe source artifact.

### 2.2 What LabelSensei already was

Verified from the repository:

- a one-route static Next.js landing page;
- static GitHub Pages export and custom domain;
- English-only marketing copy;
- WhatsApp CTA;
- static Snap → Send → See story;
- hard-coded chat/result mockup;
- a 1–10 safety/nutrition rating concept;
- marketing claims covering food, personal care, supplements, household, baby, and pet products;
- privacy and terms modals.

It contains no:

- upload application;
- server API;
- analyzer code;
- OpenAI or Gemini SDK call;
- prompt or structured schema;
- database;
- persisted language/profile;
- registry;
- grievance implementation;
- officer dashboard;
- rule/source validation;
- tests.

### 2.3 What the legacy n8n workflow already did

Verified from the export:

~~~text
generic WhatsApp webhook
    → extract one message
    → obtain image binary
    → Gemini AI Agent
       unstructured Product / Rating / Profile / Key Factors / Verdict
    → send text to WhatsApp
~~~

The prompt covers grocery, personal care, and prepared meals. It returns a generic health/quality rating and dietary profile. It has no regulatory evidence layer or public-service routing.

This establishes that the broad label-photo concept, WhatsApp delivery, Gemini rating, and some multi-category behavior are predecessor work. They must not be presented as new hackathon inventions.

### 2.4 Baseline limitations

- no working web citizen journey;
- no remembered language or localization;
- no structured response contract;
- no returned web citations;
- no verified rule packs;
- no FSSAI/FoSCoS, CDSCO, BIS Care, or NCH routing;
- no evidence provenance;
- no honest category-coverage state;
- no cache or idempotency store;
- no registry, grievance draft, or officer proof;
- no reproducible model selection;
- no tests, evaluation fixtures, or call-count assertions;
- unsafe copy such as safe, health verdict, toxins, and harmful chemicals.

---

## 3. Immediate P0 security gate

The exported workflow contains a live-looking Meta bearer credential in plaintext. It also sends that credential with a media request whose URL is obtained from an unverified webhook payload. The webhook does not verify the Meta POST signature.

The secret value must never appear in a document, command output, commit, issue, screenshot, log, or evidence artifact.

Additional critical findings:

- webhook verification does not validate the configured verification token;
- POST events do not verify X-Hub-Signature-256;
- a fixed memory session key is shared by every user;
- message IDs are extracted but not durably deduplicated;
- the media path expects image.url instead of the standard media-ID flow;
- successful n8n execution data may retain phone numbers, names, text, and binary media;
- the export marks the workflow active.

### Required user actions before any WhatsApp reuse

| ID | Action | Owner | Status | Proof required |
|---|---|---|---|---|
| SEC-000 | Disable the legacy workflow in the n8n instance | User | BLOCKED_USER | Redacted screenshot showing inactive state |
| SEC-001 | Revoke and rotate the exposed Meta token | User | BLOCKED_USER | Rotation timestamp and last four non-secret identifier characters only |
| SEC-002 | Rotate any n8n credential that reused the same token | User | BLOCKED_USER | Credential rotation confirmation without value |
| SEC-003 | Remove unsafe exports from shared locations, histories, backups, and n8n execution records where feasible | User | BLOCKED_USER | Redacted cleanup checklist |
| SEC-004 | Review Meta account logs for unexpected media requests/messages | User | BLOCKED_USER | Review completed and anomalies recorded without personal data |

Removing the token from the JSON is insufficient. Revocation is required.

The credential-free WA-001 route and signature-test foundation may be built locally. Do not add Meta credentials, connect the callback, or move into live intake/delivery beyond that foundation until SEC-000 through SEC-004 are confirmed.

---

## 4. Locked migration decisions

### D-001 — New build, new history

Front of Pack is built in E:\projects\front-of-pack as a new Git repository. LabelSensei remains read-only predecessor evidence. Do not fork its Git history or submit labelsensei.com as the hackathon build.

### D-002 — Selective, logged reuse only

Small self-owned assets or generic code may be copied only after:

- ownership is verified;
- its source path and baseline commit are logged;
- the destination is recorded;
- material changes are recorded;
- the feature does not preserve the old project's judged identity.

No wholesale copy of the old page, theme, hero, rating mockup, claims, or privacy copy.

### D-003 — Multi-category is supported but not claimed as new

Food/FSSAI is the recorded hero journey. Existing multi-category product understanding is platform leverage and predecessor work.

Coverage tiers:

| Tier | Categories | Permitted result |
|---|---|---|
| A | Food and non-alcoholic beverages | Verified FSSAI rules, experimental food panel, FSSAI/FoSCoS routes |
| B | Cosmetics/personal care and applicable BIS/general packaged goods | Category/general rules and verified BIS Care/NCH route only after pack tests pass |
| C | Other packaged consumer products | Label explanation plus label_only coverage; no specialist regulatory conclusion |
| Excluded | Medicines, medical devices, clinical decisions, and unverified high-stakes categories | Refuse regulatory analysis and direct to appropriate professional/general information |

Owner-reported category success is not release proof. Each claimed category needs a golden fixture and coverage test.

### D-004 — One semantic backend

The Front of Pack API is the only semantic backend. It owns:

- profile/language resolution;
- image normalization/hash/cache;
- the single Terra request;
- strict validation;
- category coverage;
- allow-listed service routing;
- exact local enrichment;
- result persistence and rendering.

No n8n, browser, UI, registry, or officer component makes an LLM call.

### D-005 — n8n is not used

The legacy workflow is never edited, cloned, imported, deployed or shipped. Front of Pack contains no n8n dependency or workflow export. The historical hash/audit remains only for eligibility and security evidence.

### D-006 — Direct Cloudflare WhatsApp edge

~~~text
Meta → /api/whatsapp on the Cloudflare OpenNext Worker
→ raw-body signature + D1 idempotency
→ private R2 media + Analysis Queue
→ shared Jobs Worker → Delivery Queue → Meta Graph
~~~

The public Worker acknowledges quickly. Queue messages contain job IDs and attempt numbers only. Recipient/media identifiers remain application-encrypted and short-lived in D1. Analysis and delivery retry independently; delivery can never call Terra.

### D-007 — New branding and copy

The submitted app may retain the LabelSensei/Front of Pack relationship, but the judged experience must not be the old dark-teal landing page with a 1–10 safe/unsafe score.

Prohibited predecessor copy includes:

- safe or unsafe product labels;
- health verdict;
- toxic or toxins;
- harmful chemicals;
- carcinogen claims;
- endocrine-disruptor conclusions without verified evidence;
- protect your health;
- ratings presented as medical or official truth.

### D-008 — Hosting

Every submitted runtime component uses the credited Cloudflare account:

- Next.js App Router through `@opennextjs/cloudflare` on Workers;
- one D1 database;
- one dedicated private R2 media bucket;
- Analysis and Delivery Queues consumed by one Jobs Worker;
- Workers Secrets/Secrets Store;
- `workers.dev` first and a custom domain second.

OpenAI and Meta remain the required external APIs. The static GitHub Pages deployment, Vercel, Postgres and n8n are not target infrastructure.

### D-009 — No raw legacy workflow in Git

No workflow export may be committed. The baseline is represented by its hash and redacted audit facts, not by the secret-bearing JSON.

### D-010 — Separate test infrastructure preferred

Use a separate WhatsApp test number and Meta app/webhook configuration for Front of Pack if available. Reusing the production LabelSensei number requires an explicit rollback plan and completed security rotation. This remains a user decision before WA deployment.

### D-011 — Cloudflare credits and domain

The supplied billing screenshot shows USD 3,000 active Startup credits remaining until 21 August 2027. It also states that Registrar purchases and AI Gateway are excluded. Therefore the domain is separately paid, AI Gateway is not used, and `workers.dev` prevents procurement from blocking release. Workers Paid activation and actual credit coverage must be confirmed in billing before relying on higher runtime limits.

---

## 5. Target system

~~~text
Web user
    → Next.js/OpenNext Cloudflare Worker ───────────┐
                                                    │
WhatsApp user                                       │
    → direct verified /api/whatsapp on same Worker ─┤
                                                    ▼
                                       D1 profile/idempotency/cache
                                                    │
                                      normalize + EXIF strip + hash
                                                    │
                                     private temporary R2 object
                                                    │
                                           Analysis Queue
                                                    │
                                         Cloudflare Jobs Worker
                                                    │
                                  D1 conditional claim by attempt number
                                      ┌─────────────┴─────────────┐
                                      │                           │
                              fresh cache / old job      ONE Terra request
                                  0 calls                 image + strict schema
                                                          + verified packs/routes
                                                          + hosted search
                                                                  │
                                                  validate + exact enrichment
                                                                  │
                                                        D1 complete result
                                                  ┌───────────────┴──────────┐
                                                  │                          │
                                             web polling              Delivery Queue
                                                                             │
                                                                     same Jobs Worker
                                                                             │
                                                                          WhatsApp
                                                  terminal R2/routing cleanup
~~~

Queue messages contain IDs and attempt numbers only. Images stay in private R2; encrypted short-lived WhatsApp routing stays in D1. Delivery retry never repeats semantic analysis.

---

## 6. Reuse and eligibility ledger

Update this table before copying any predecessor file or behavior.

| Reuse ID | Predecessor item | Baseline evidence | Ownership | Disposition | Destination | Required material change | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Label-photo concept | LabelSensei site + n8n hash | User-owned claim; verify | Reference and disclose | Product narrative | Public-service evidence journey | APPROVED_REFERENCE |
| R-002 | Multi-category intent | LabelSensei page and legacy prompt | User-owned claim; verify | Reference and disclose | Category taxonomy | Coverage tiers, rule tests, honest label_only | APPROVED_REFERENCE |
| R-003 | WhatsApp channel concept | wa.me CTA + active-marked n8n | User-owned operational setup | Reference and disclose | Direct Cloudflare Worker webhook | Full security rebuild + D1/R2/Queues | PENDING_SEC_GATE |
| R-004 | Legacy n8n workflow | Baseline SHA-256 | Contains secrets | Do not copy or ship | None | No n8n in Front of Pack | REJECTED_RAW |
| R-005 | Gemini agent/prompt | n8n AI Agent | User-owned | Remove | None | Terra strict contract replaces it | REJECTED |
| R-006 | Fixed shared memory | n8n session key | Unsafe | Remove | None | D1 profile identities | REJECTED |
| R-007 | Graph send-message behavior | n8n HTTP nodes | User-owned configuration | Reimplement after rotation; copy no secrets/config | Jobs Worker delivery handler | Fixed Graph endpoints, Queue retry, redacted logs | PENDING |
| R-008 | Next.js landing page | LabelSensei page.tsx | User-owned | Do not copy wholesale | None | New app and information architecture | REJECTED_WHOLESALE |
| R-009 | Animation variants | LabelSensei page.tsx | Verify authorship | Optional selective reuse | Component utility | Log copied lines and restyle | UNDECIDED |
| R-010 | Theme/font tokens | LabelSensei globals/layout | Verify font/licence | Optional selective reuse | New design tokens | New public-service visual identity | UNDECIDED |
| R-011 | WhatsApp icon | LabelSensei public asset | Provenance unrecorded | Hold | None until verified | Record licence/ownership | BLOCKED_OWNERSHIP |
| R-012 | Potato-chip image | LabelSensei public asset | Provenance unrecorded | Internal test only | Golden fixture if verified | Remove adverse real-brand assertion | BLOCKED_OWNERSHIP |
| R-013 | Privacy/terms copy | LabelSensei page.tsx | User-owned | Rewrite completely | Honesty/privacy pages | Match actual processors and retention | REJECTED_COPY |
| R-014 | 1–10 rating and safe legend | Static JSX + legacy prompt | Pre-existing and unsafe | Remove | None | Evidence-linked restrained findings | REJECTED |
| R-015 | Meta account/test infrastructure | n8n credential references | User-controlled | Operational reuse only after rotation | Cloudflare Workers Secrets | Separate Meta test setup preferred | BLOCKED_USER |

For every APPROVED_COPY added later, record:

~~~text
source path
source commit/hash
ownership/licence
destination path
copied lines/assets
material changes
Front of Pack commit
test/proof
final disclosure wording
~~~

---

## 7. Materially new hackathon delta

Only DONE and evidenced items may appear under “built during the hackathon.”

Planned new work:

- new full-stack Front of Pack repository;
- Cloudflare OpenNext web/API Worker, D1 schema, private R2 media lifecycle and two-queue Jobs Worker;
- functioning browser capture/upload/paste journey;
- anonymous remembered profile and twelve-language setting;
- GPT-5.6 Terra model selection and one-call contract;
- strict multi-product structured schema;
- hosted-search source verification;
- image/web/mixed/unavailable evidence provenance;
- verified FSSAI, cosmetics/general-pack rule packs;
- allow-listed FSSAI/FoSCoS, BIS Care, and NCH service routing;
- explicit category coverage levels;
- experimental food-only FOP presentation;
- cache and call-count instrumentation;
- secure, idempotent WhatsApp transport;
- grievance draft from stored evidence;
- public registry and minimal officer proof;
- honesty, thresholds, services, and built-with pages;
- security, privacy, accessibility, localization, and regression tests.

If an item is cut or incomplete, remove it from the final disclosure and demo.

Submission disclosure template—use only after replacing planned items with the DONE/evidenced release facts:

> LabelSensei previously established the label-photo concept, a static marketing site, a WhatsApp/Gemini rating prototype, and general multi-category product learnings. For this hackathon, Front of Pack was built separately as a new public-service application. The following completed features are new: [insert only DONE items with release proof]. Reused assets/components: [insert only APPROVED_COPY ledger entries]. Limitations and mocks: [insert release facts].

---

## 8. Dependency graph

~~~text
ELIG-001 baseline snapshot [DONE]
    → ELIG-002 initialize new Git repo [DONE]
    → ELIG-003 baseline commit + origin/main [DONE]
    → ARCH-001 lock Cloudflare architecture
    → CF-001 confirm Workers Paid/account access
          ├→ PLATFORM-001 OpenNext/workerd/public Worker
          ├→ DATA-001 D1 migration
          ├→ QUEUE-001 R2 + two Queues + Jobs Worker
          ├→ MEDIA-001 Workers-runtime normalizer
          ├→ MODEL-001 Terra feasibility spike
          ├→ RULES-001 food pack
          └→ RULES-002 cosmetics/general pack

SEC-000..004 user remediation
    → WA-001 direct Worker webhook + Meta test setup

MODEL-001 + RULES-001 + SERVICES-001 + QUEUE-001
    → CORE-001 schema
    → CORE-002 prompt/call boundary
    → CORE-003 validator
    → CORE-004 cache/idempotent analysis

PLATFORM-001 + DATA-001 + QUEUE-001 + PROFILE-001 + CORE-001..004
    → WEB-001 complete web citizen loop

CORE-001..004 + PROFILE-001 + WA-001 + QUEUE-001
    → WA-002 secure intake/media
    → WA-003 language/commands
    → WA-004 delivery/replay proof

CORE + RULES + SERVICES
    → PUBLIC-001 grievance
    → REGISTRY-001 registry/synthetic joins
    → OFFICER-001 minimal officer proof

WEB + WA + PUBLIC + REGISTRY + OFFICER
    → I18N-001
    → QA-001
    → RELEASE-001
    → SUBMIT-001
~~~

---

## 9. Workstreams and task register

Cut tiers:

- C0: never cut;
- C1: keep surface, cut depth;
- C2: cut before C1;
- C3: optional stretch.

### 9.1 Eligibility and security

| ID | Depends on | Output | Acceptance/proof | Owner | Status | Cut |
|---|---|---|---|---|---|---|
| ELIG-001 | None | Baseline facts and hashes in this document | LabelSensei HEAD and n8n SHA recorded; no secret copied | Codex | DONE | C0 |
| ELIG-002 | ELIG-001 | New Git repository | `git status` succeeds on `main`; no predecessor history | Codex | DONE | C0 |
| ELIG-003 | ELIG-002 | Baseline commit and remote backup | Commit `914ad7dc0ab57f13a0259417065052efb47d9ea4` contains docs and `.gitignore` only and is pushed to `origin/main` | Codex | DONE | C0 |
| ELIG-004 | ELIG-003 | Reuse log mechanism | Every copied predecessor item requires ledger entry | Codex | DONE | C0 |
| SEC-000..004 | User action | Rotated and reviewed Meta setup | Redacted confirmation set | User | BLOCKED_USER | C0 |
| SEC-005 | SEC-000..004 | Secret scan baseline | Repository/Cloudflare configs scan clean; raw workflow absent | Codex | TODO | C0 |
| DEC-001 | SEC-001 | Test-number decision | Separate number selected, or reuse rollback documented | User | BLOCKED_USER | C0 |

### 9.2 Platform and data

| ID | Depends on | Output | Acceptance/proof | Owner | Status | Cut |
|---|---|---|---|---|---|---|
| ARCH-001 | ELIG-001 | Reconciled Cloudflare target and predecessor boundary | All four docs agree on OpenNext Workers, D1, private R2, two Queues, one Jobs Worker, direct Meta webhook and no n8n | Codex | DONE | C0 |
| CF-001 | ELIG-003 | Cloudflare platform access | Wrangler authentication works; Workers Paid/Standard and startup-credit billing coverage confirmed without storing account token | User + Codex | BLOCKED_USER | C0 |
| PLATFORM-001 | CF-001 | OpenNext full-stack shell | Next.js 16/OpenNext scaffold exists locally; completion requires `npm run preview` in workerd and a public `workers.dev` skeleton | Codex | IN_PROGRESS | C0 |
| PLATFORM-002 | PLATFORM-001 | Least-privilege Wrangler binding/secret contract | App/Jobs types generated; each Worker lacks the other's unnecessary secrets | Codex | TODO | C0 |
| DATA-001 | CF-001 | Compact D1 migration | Initial migration and analysis persistence pass in simulated local D1; completion requires remote migration and JSON/row-cap proof | Codex | IN_PROGRESS | C0 |
| DATA-002 | DATA-001 | D1 seed loader | Rules/services/synthetic data load reproducibly | Codex | TODO | C0 |
| QUEUE-001 | CF-001,DATA-001 | Private R2 + Analysis/Delivery Queues + Jobs Worker | One simulated local Analysis Queue round trip passes with an ID+attempt payload; Delivery Queue, DLQ, crash and duplicate-message proof remain | Codex | IN_PROGRESS | C0 |
| MEDIA-001 | PLATFORM-001,QUEUE-001 | Workers-runtime image normalizer/R2 lifecycle | Terminal R2 cleanup passes in the local analysis flow; max-image MIME/dimensions, normalization/EXIF removal and canonical-hash proof remain | Codex | IN_PROGRESS | C0 |
| CLEANUP-001 | DATA-001,QUEUE-001 | Hourly/lazy expiry cleanup | Expired ciphertext/nonces cleared, orphan R2 removed, operation idempotent | Codex | TODO | C0 |
| DOMAIN-001 | PLATFORM-001 | Stable TLS hostname | Custom domain works without Access; `workers.dev` remains release fallback | User + Codex | BLOCKED_USER | C1 |
| BUDGET-001 | CF-001 | Cloudflare/OpenAI budget telemetry | Billing exclusions, Worker/D1/R2/Queue use and OpenAI spend documented separately | Codex | TODO | C1 |
| OBS-001 | DATA-001 | Structured request metrics | Response ID, latency, search use, tokens/cost stored without PII | Codex | TODO | C1 |

### 9.3 Model, rules, and services

| ID | Depends on | Output | Acceptance/proof | Owner | Status | Cut |
|---|---|---|---|---|---|---|
| MODEL-001 | PLATFORM-002,QUEUE-001,MEDIA-001 | Terra image/schema spike in Jobs Worker | On 2026-08-23 one R2-backed simulated Analysis Queue job completed in about 3.9s with exactly one Responses request and a persisted response ID; hosted-search/usage evidence and production bindings remain | Codex | IN_PROGRESS | C0 |
| MODEL-002 | MODEL-001 | Hosted-search spike | Optional in-call web-search configuration exists; name-only image must still prove tool-sourced URLs in the same response | Codex | IN_PROGRESS | C0 |
| RULES-001 | ELIG-003 | Verified food rule pack | Build rejects missing source/status/units | Codex | TODO | C0 |
| RULES-002 | RULES-001 | Cosmetics/general-pack baseline | Golden cosmetic and general-pack fixtures pass coverage policy | Codex | TODO | C1 |
| SERVICES-001 | ELIG-003 | Allow-listed service directory | FSSAI/FoSCoS, BIS Care, NCH routes have official source and category constraints | Codex | TODO | C0 |
| CORE-001 | MODEL-001,RULES-001,SERVICES-001 | Strict AnalysisResult schema | Provider strict schema exists and is covered by Jobs tests; full single, multi, unknown and label_only fixtures remain | Codex | IN_PROGRESS | C0 |
| CORE-002 | CORE-001,MODEL-002 | Unified prompt and only call site | Direct Responses call site exists in the Jobs Worker with no automatic retry; durable one-attempt integration remains | Codex | IN_PROGRESS | C0 |
| CORE-003 | CORE-001 | Contract validator | Strict result-shape validation and failure persistence are wired; orphan citations/rules/routes, food panel on non-food, prohibited wording and real pack validation remain | Codex | IN_PROGRESS | C0 |
| CORE-004 | CORE-002,CORE-003,DATA-001,QUEUE-001,MEDIA-001 | One-call queued analysis/cache | Local proof now covers miss=1, identical exact-image hit=0 and corrupt-image failure persistence; stale/redelivered attempts=0, explicit retry and production bindings remain | Codex | IN_PROGRESS | C0 |
| EVAL-001 | CORE-003 | Golden evaluation set | All required food/non-food/failure fixtures have assertions | Codex | TODO | C0 |

### 9.4 Profiles and web journey

| ID | Depends on | Output | Acceptance/proof | Owner | Status | Cut |
|---|---|---|---|---|---|---|
| PROFILE-001 | DATA-001,PLATFORM-002 | Anonymous profiles/identities | HMAC digest, secure cookie, null language until selection | Codex | TODO | C0 |
| PROFILE-002 | PROFILE-001 | Settings/delete | Preference persists; delete rotates identity and detaches scan history | Codex | TODO | C0 |
| WEB-001 | PLATFORM-001,PROFILE-001 | Mobile landing/onboarding | First-use language works at 360px | Codex | TODO | C0 |
| WEB-002 | WEB-001,CORE-004 | Upload/camera/paste/sample | One input starts one idempotent scan | Codex | TODO | C0 |
| WEB-003 | WEB-002 | Result renderer | Multi-category cards, evidence, citations, coverage, experimental/synthetic notices | Codex | TODO | C0 |
| WEB-004 | WEB-003,PROFILE-002 | Returning-user loop | Refresh/reopen uses saved language; change/delete pass | Codex | TODO | C0 |
| ACCESS-001 | WEB-003 | Read-aloud and structural accessibility | Keyboard/screen-reader/focus checks pass | Codex | TODO | C1 |

### 9.5 WhatsApp transport

| ID | Depends on | Output | Acceptance/proof | Owner | Status | Cut |
|---|---|---|---|---|---|---|
| WA-001 | SEC-000..004,PLATFORM-002,DATA-001,QUEUE-001 | Direct Cloudflare Meta webhook | GET token and raw POST HMAC tests pass; valid POST intentionally returns 503 until D1 unique-event persistence and Queue publish are durable | Codex | IN_PROGRESS | C0 |
| WA-002 | WA-001,MEDIA-001 | Secure Graph media/R2 flow | Media-ID metadata lookup, allow-listed host/MIME/size, normalized private R2 object and terminal deletion | Codex | TODO | C0 |
| WA-003 | WA-002,PROFILE-001 | Language and commands | First contact, change language, delete data, image-before-language all pass | Codex | TODO | C0 |
| WA-004 | WA-002,CORE-004 | Idempotent Analysis/Delivery Queue flow | One real image returns localized result; webhook replay/analysis redelivery make zero duplicate Terra calls | Codex | TODO | C0 |
| WA-005 | WA-004,CLEANUP-001 | Encrypted routing/retention/failure policy | Recipient/media ciphertext cleared; R2 removed; delivery 429/retry never invokes Terra | Codex | TODO | C0 |
| WA-006 | WA-004,WEB-003 | Signed full report and item details | Stored render only; no model call; link expires | Codex | TODO | C1 |

### 9.6 Public-service and secondary proof

| ID | Depends on | Output | Acceptance/proof | Owner | Status | Cut |
|---|---|---|---|---|---|---|
| PUBLIC-001 | CORE-003,SERVICES-001,WEB-003 | Editable grievance draft | Category-appropriate route; source fields; missing evidence; clearly unsubmitted; zero calls | Codex | TODO | C0 |
| REGISTRY-001 | CORE-003,DATA-002 | Minimal registry/product page | Exact identity only; private image never exposed | Codex | TODO | C1 |
| REGISTRY-002 | REGISTRY-001 | Synthetic licence/recall cards | Exact seed match and demo warning | Codex | TODO | C1 |
| OFFICER-001 | REGISTRY-001 | Minimal officer page | AI-generated leads, evidence, unknown rate; no violation/map | Codex | TODO | C1 |
| TRUST-001 | RULES-001,SERVICES-001 | Thresholds/services pages | Public sources, policy status, coverage limitations visible | Codex | TODO | C0 |
| TRUST-002 | ELIG-004,OBS-001 | Honesty/built-with pages | Reuse/new ledger, data, cost, limitations, Codex role accurate | Codex | TODO | C0 |

### 9.7 Localization, QA, release

| ID | Depends on | Output | Acceptance/proof | Owner | Status | Cut |
|---|---|---|---|---|---|---|
| I18N-001 | WEB-003,WA-003 | Twelve fixed UI catalogues | All render; no missing keys/overflow | Codex | TODO | C0 |
| I18N-002 | I18N-001 | Deep language QA | en/hi/mr/ur reviewed; Urdu RTL passes | User + Codex | TODO | C0 |
| QA-001 | WEB-004,WA-005,PUBLIC-001,TRUST-002,EVAL-001 | Full regression suite | All C0 automated/manual checks pass | Codex | TODO | C0 |
| QA-002 | QA-001 | Five-user usability evidence | Tasks, failures, fixes recorded without PII | User | TODO | C0 |
| RELEASE-001 | QA-001 | Public release candidate | Incognito mobile/desktop, samples, live status, no access request | Codex | TODO | C0 |
| RELEASE-002 | RELEASE-001 | Two-minute video | Every shown action works three times; duration under two minutes | User + Codex | TODO | C0 |
| RELEASE-003 | RELEASE-001 | Submission package | Under-250-word summary, working links, licences, disclosure, release hash | User + Codex | TODO | C0 |
| SUBMIT-001 | RELEASE-002,RELEASE-003 | Submitted entry | Submit by noon 28 Aug; confirmation retained | User | TODO | C0 |

### 9.8 Required acceptance scripts

The scaffold must expose these stable commands so later agents do not invent different verification paths:

| Command | Required effect |
|---|---|
| npm run lint | Lint application, scripts and tests |
| npm run typecheck | Type-check without emitting |
| npm test | Unit and contract tests |
| npm run test:one-call | Instrumented zero/one-call and retry assertions |
| npm run test:rules | Rule-pack, source, service-route and coverage verification |
| npm run test:i18n | Missing-key, interpolation, RTL and overflow-oriented catalogue checks |
| npm run test:security | Secret scan plus webhook/channel signature, replay and media-policy tests |
| npm run test:e2e | Fixture-backed web citizen journey |
| npm run preview | OpenNext build running under Cloudflare `workerd` |
| npm run cf-typegen | Regenerate typed bindings for app and Jobs Workers |
| npm run test:cloudflare | D1, R2, Queue, Cron, max-image and least-privilege binding tests |
| npm run deploy:dry-run | Build/bundle/startup-limit validation without production release |
| npm run build | Production build with verified configuration |
| npm run deploy | Deploy OpenNext app and Jobs Worker to Cloudflare |
| npm run evidence:release | Generate a redacted test/dependency/reuse summary from actual outputs |

Until a script exists, the owning task cannot be DONE. CI runs lint, typecheck, tests and build on every release candidate.

Current local verification snapshot (2026-08-23): combined multi-config `workerd` runs with simulated D1, R2 and Queues proved a fresh `202` upload, exactly one Terra call, D1 completion, 256-bit capability-authorized polling, unauthorized `404`, localized result persistence, and an identical image/language HTTP `200` cache hit without another Queue job. Root tests pass 21/21 and Jobs Worker tests pass 12/12. A deliberately corrupt PNG-signature sample exercised persisted provider failure. This proves the local vertical-slice foundation only: normalization/EXIF removal, verified rule/service packs, durable WhatsApp D1/Queue/Graph flow, real Cloudflare resource IDs and deployment are still open, so G1, G3 and G4 are not complete.

---

## 10. Stage gates

### G0 — Security and eligibility baseline

Requires:

- SEC-000 through SEC-004 confirmed;
- new Git history initialized;
- baseline docs committed before reuse;
- predecessor HEAD/hash recorded;
- reuse ledger active;
- ownership unknowns held, not copied.

Failure action: do not connect WhatsApp or copy predecessor code. Web/model work may continue.

### G0.5 — Cloudflare platform

Requires:

- Workers Paid/Standard and startup-credit billing coverage confirmed;
- OpenNext `npm run preview` passes under `workerd`;
- public `workers.dev` skeleton works without Cloudflare Access;
- local/remote D1 migration and read/write pass;
- private R2 put/get/delete pass;
- Analysis and Delivery Queue round trips pass through one Jobs Worker;
- generated bindings and least-privilege Worker secrets pass;
- dry-run bundle/startup limits pass.

Failure action: stop feature implementation and repair the platform. A custom domain is not required for this gate.

### G1 — Terra feasibility

Requires:

- one R2-backed Analysis Queue job invoking the configured Terra model from the Jobs Worker;
- strict structured output;
- one name-only hosted-search request;
- response IDs, latency, usage, and cost;
- exactly one Responses request per attempt.
- Queue redelivery after provider claim makes zero additional requests.

Failure action: reduce schema/item scope or use validated samples for the recorded demo. Do not introduce a second model call.

### G2 — Trust contract

Requires:

- strict schema and validator;
- returned search source verification;
- enabled rule and route validation;
- category coverage tests;
- food-only experimental panel guard;
- prohibited wording rejection;
- golden fixtures.

Failure action: disable the failing category/rule/route. Never loosen evidence validation to make a demo pass.

### G3 — Web citizen loop

Requires:

- first-use and remembered language;
- one image input;
- complete stored result;
- evidence/citations/coverage;
- unknown/retake path;
- zero-call cache hit;
- explicit R2 terminal deletion plus lifecycle-backstop configuration;
- 360px mobile run.
- all checks run on the deployed Worker/D1 environment, not only Node development.

Failure action: stop secondary surfaces and fix the web loop.

### G4 — WhatsApp

Requires:

- verified Meta GET token and POST signature;
- quick acknowledgement;
- durable message-ID idempotency;
- application-encrypted short-lived recipient/media identifiers in D1;
- correct media-ID lookup and constrained download;
- private normalized R2 object and terminal deletion;
- stored language;
- one real test-number result;
- webhook replay and Analysis Queue redelivery with zero duplicate provider calls;
- Delivery Queue retry with zero provider calls;
- expiry Cron/lazy media/recipient cleanup.

Failure action: cut all C1 depth and finish the direct Cloudflare channel before adding secondary work. There is no n8n fallback.

### G5 — Public-service completion

Requires:

- compatible allow-listed route per covered item;
- label_only behavior where coverage is absent;
- exact synthetic licence/recall match;
- unsubmitted editable grievance;
- registry and officer minimum surfaces;
- thresholds/services/honesty disclosure.

Failure action: remove the unverified route/rule or reduce the secondary surface; keep the core citizen result.

### G6 — Release

Requires:

- all C0 tasks DONE;
- all 12 catalogues render;
- en/hi/mr/ur deeper checks;
- mobile/accessibility/privacy/security pass;
- public `workers.dev` or custom-domain link in incognito, with no Cloudflare Access gate;
- three consecutive clean demo runs;
- final before/during disclosure generated from DONE ledger items;
- video and summary within limits;
- release commit hash and submission confirmation.

Failure action: follow the final-plan cut order. Never claim or demo an unfinished feature.

---

## 11. Evidence contract

After Git initialization, create:

~~~text
evidence/
├── baseline/
│   ├── labelsensei-head.txt
│   ├── labelsensei-tree.txt
│   ├── n8n-workflow.sha256.txt
│   └── current-state.redacted.md
├── gates/
│   ├── G0/
│   ├── G1/
│   ├── G2/
│   ├── G3/
│   ├── G4/
│   ├── G5/
│   └── G6/
└── release/
    ├── disclosure.md
    ├── dependency-licences.md
    ├── test-summary.md
    ├── release-commit.txt
    └── submission-confirmation.redacted.md
~~~

Evidence rules:

- no secrets, raw phone numbers, names, user images, order details, or unrestricted provider payloads;
- screenshots must redact account IDs and recipients;
- model proof records response ID only if safe, call count, timing, usage, and a redacted fixture/result;
- security rotation proof records time and action, never credential value;
- legacy n8n proof is limited to the recorded hash/redacted audit; no new n8n artifact exists;
- real user usability notes are anonymous and consented;
- every release claim links to a task/gate proof.

---

## 12. Day mapping

### 23 August

Target: G0, G0.5 and G1.

- user completes SEC-000 through SEC-004;
- preserve the completed Git/GitHub baseline and build locally;
- confirm Workers Paid/Standard, authenticate Wrangler and deploy the OpenNext `workers.dev` skeleton;
- migrate D1; create private R2, both Queues and the Jobs Worker; run `workerd`/round-trip gates;
- run the R2-backed Terra/schema/search spikes;
- begin rules and service directory.

### 24 August

Target: G2 and G3.

- schema, prompt, validator, cache;
- profile/language;
- complete mobile web loop;
- samples and unknown states;
- grievance draft skeleton.

### 25 August

Target: G4.

- direct Cloudflare Meta webhook, encrypted D1 routing and Graph media-ID flow;
- Analysis/Delivery Queue redelivery and cleanup proof;
- real WhatsApp test;
- commands, language, idempotency, delivery, retention.

### 26 August

Target: G5.

- category packs/service routes;
- registry and synthetic joins;
- minimal officer;
- trust/built-with;
- all language catalogues.

### 27 August

Target: G6 release candidate.

- regression, accessibility, security, slow-network;
- five-user test;
- public deployment;
- disclosure and video;
- freeze by 8:00 PM.

### 28 August

- final smoke;
- record/finalize video and summary;
- submit by noon;
- retain confirmation;
- official deadline remains emergency buffer only.

---

## 13. Cut order

Never cut:

- security remediation;
- new-project eligibility evidence;
- public web loop;
- remembered language;
- one-call invariant;
- evidence/citations/coverage;
- honest unknowns;
- WhatsApp;
- minimal registry and officer surfaces;
- honesty/built-with disclosure.

Reduce or cut in order:

1. animations and decorative design;
2. officer filters/charts;
3. registry version history;
4. rich sharing/print;
5. cart polish beyond six items;
6. PWA/offline;
7. cross-channel linking;
8. mock grievance adapter;
9. deeper category packs beyond verified baseline.

A category can fall back to label_only rather than block the release.

---

## 14. User decisions and credentials queue

| Decision/input | Needed by | Recommended default | Status |
|---|---|---|---|
| Confirm legacy workflow disabled | Before WA-001 | Disable now | BLOCKED_USER |
| Confirm Meta token rotated | Before WA-001 | Rotate now | BLOCKED_USER |
| Separate WhatsApp test number available? | Before WA deployment | Use separate number | BLOCKED_USER |
| Cloudflare Startup credits | Architecture/budget | Screenshot confirms USD 3,000 active through 21 Aug 2027; Registrar/AI Gateway excluded | CONFIRMED |
| Cloudflare Wrangler/account authorization | CF-001 | Authenticate locally without sharing an API token in chat/docs | BLOCKED_USER |
| Workers Paid/Standard active and credits apply | CF-001 | Confirm in billing before relying on 5-minute CPU configuration | BLOCKED_USER |
| Custom domain choice/purchase | DOMAIN-001 | Buy separately; Registrar is excluded from credits; keep `workers.dev` fallback | BLOCKED_USER |
| OpenAI project key/model access | MODEL-001 | Configured locally in the ignored Jobs Worker secret file; never paste into chat/docs or expose to the public Worker | CONFIRMED_LOCAL |
| Meta app/test-number secrets after rotation | WA-001 | Add directly as scoped Workers Secrets | BLOCKED_USER |
| Ownership of WhatsApp icon and product image | Before reuse | Do not reuse until proven | BLOCKED_USER |
| Human reviewers for hi/mr/ur | I18N-002 | Owner plus one fluent reviewer each where possible | TODO |

User-only blockers do not authorize storing credentials in the repository. Configure them directly in the provider secret manager or local ignored environment.

---

## 15. Definition of execution-ready

Implementation has started locally because:

- this pipeline, HLD, LLD, and final plan have no architectural contradiction;
- ELIG-002 and ELIG-003 are DONE at baseline commit `914ad7dc0ab57f13a0259417065052efb47d9ea4`, pushed to `origin/main`;
- Cloudflare account/Workers Paid access and OpenAI access are available or explicitly scheduled;
- no raw n8n export is inside the workspace;
- the first READY task is unambiguous.

Web, Cloudflare platform, model, rules and profile work may proceed while the user completes the P0 Meta actions. No WhatsApp webhook connection or Meta credential use may begin until SEC-000 through SEC-004 are confirmed.

The next safe execution focus is:

> **Connect the verified Terra and WhatsApp route foundations to durable D1/R2/Queue state, then validate the complete local flows before Wrangler authentication, resource provisioning, or deployment.**

---

## 16. Pipeline TL;DR

~~~text
secure the predecessor
    → snapshot and disclose the baseline
    → initialize a genuinely new repository
    → deploy Cloudflare OpenNext + D1 + private R2 + two Queues
    → prove one R2-backed Terra image/search request in the Jobs Worker
    → build schema + validator + category/service packs
    → complete remembered-language web journey
    → replace the unsafe n8n backend with a direct verified Worker webhook
    → add grievance + registry + officer minimums
    → prove localization, privacy, security, accessibility, and call counts
    → generate disclosure from completed evidence
    → freeze, record, submit
~~~

The competition story is defensible because the predecessor is documented honestly and the judged value is materially new.
