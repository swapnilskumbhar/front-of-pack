# Front of Pack — Final Hackathon Plan

> **Status:** FINAL and authoritative
> **Locked:** 23 August 2026
> **Official deadline:** 28 August 2026, 8:00 PM IST
> **Internal release freeze:** 27 August 2026, 8:00 PM IST
> **Submission target:** 28 August 2026, 12:00 PM IST
> **Authority:** When scope, priority, demo, or schedule conflicts with another document, this plan wins. Reconcile the HLD/LLD afterward.
> **Execution status:** [EXECUTION_PIPELINE.md](./EXECUTION_PIPELINE.md) owns task dependencies, security gates, evidence, and the reuse ledger.
> **Platform onboarding:** [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) owns repository, Wrangler, resource, secret, deployment, billing, and domain setup.
> **Retired:** The Front of Pack Playbook is background research only and is no longer an implementation plan.

---

## 1. The decision

We are on the right track.

The winning project is not another generic nutrition scanner. It is:

> **Front of Pack — an independent, multilingual citizen-access layer that turns one packaged-product image into an evidence-linked explanation and connects the consumer to the appropriate verified Indian service without pretending to be government.**

The user chooses a language once. On web or WhatsApp, they send one image containing one or several products. One GPT-5.6 Terra Responses request reads the image, optionally searches the web when only names or incomplete facts are visible, and returns structured transcription plus localized findings. The application validates it, derives only reproducible package arithmetic without another AI call, and displays warning-first results.

The competition story stays food/FSSAI-first because it is the clearest public-service narrative. The submitted product is broader: predecessor scenarios for cosmetics, personal care, household, baby-care, pet-care, supplements, and other packaged labels are ported and revalidated through the new Terra call. Regulatory depth is shown only where a rule pack and regression fixture are verified.

The audited predecessor is a static LabelSensei landing site plus an active-marked n8n/Gemini WhatsApp rating prototype. The label-photo concept, WhatsApp channel, general multi-category idea, Gemini rating, and product learnings are pre-existing. Front of Pack must be a separate new build with a new Git history and a materially new public-service citizen journey.

This direction fits the competition because it presents:

- a real Indian public-service problem;
- a complete citizen journey that works without an admin explanation;
- mobile and multilingual access;
- meaningful AI use rather than decorative AI;
- a technically simple but auditable implementation;
- honest handling of synthetic data, uncertainty, and government boundaries.

---

## 2. Product promise

### Citizen promise

> Upload one image. Understand what any supported package says, what the evidence supports, and which verified service can help—in your saved language.

### Public-service problem

Important packaged-product declarations and claims are difficult for ordinary consumers to interpret. Related rules, certification, licence information, recalls, and grievance routes are fragmented across specialist services. Front of Pack provides the missing citizen-facing access layer.

### What the result may contain

- all sufficiently identifiable supported packaged products in the image, up to six;
- an experimental food-only front-of-pack presentation;
- claim-versus-evidence checks;
- ingredients and nutrition in plain language;
- package facts separated from provisional web facts;
- uncertainty and a clearer-photo request when needed;
- exact synthetic licence/recall matches;
- read-aloud output;
- an optional editable grievance draft;
- category coverage and a verified FSSAI/FoSCoS, BIS Care, NCH, or other allow-listed route when appropriate;
- a stored full report shared by web and WhatsApp.

### What it never claims

- that a product is healthy, safe, unsafe, toxic, illegal, or approved;
- that an AI finding is a confirmed regulatory violation;
- that an experimental score is an official FSSAI score;
- that a synthetic licence/recall record came from a live government system;
- that a grievance was submitted.

---

## 3. Non-negotiables

1. **Web and WhatsApp:** both must work through the same analysis service.
2. **Remembered language:** the user chooses once per browser or WhatsApp profile and can change/delete it.
3. **Twelve languages:** en, hi, mr, bn, ta, te, kn, gu, ml, pa, or, ur.
4. **Multiple products and categories:** one image can return up to six ordered food, cosmetic, personal-care, household, baby-care, pet-care, supplement, or other supported packaged products.
5. **One-call invariant:** one cache miss equals one Terra Responses request; one cache hit equals zero.
6. **No hidden pipeline:** no server-side crop, segment, region, parse-list, per-product, repair, explanation, or translation calls.
7. **Evidence:** image, web, mixed, and unavailable facts are visibly distinct.
8. **Real citations:** every web fact resolves to a source actually returned by hosted search.
9. **Verified rules and services only:** unverified rule IDs and service routes are disabled.
10. **Honest unknowns:** insufficient or conflicting evidence never becomes a guessed result.
11. **Experimental label:** every INR-style score or HIGH IN research visualization is permanently marked non-official.
12. **Registry and officer proof:** both exist, but remain minimal and secondary to the citizen experience.
13. **Synthetic government data:** licence and recall examples are clearly marked on every surface.
14. **Privacy:** no health profile, inferred location, public user upload, or durable consumption dossier.
15. **Honesty:** no official branding, implied endorsement, live government integration, or automatic grievance submission.
16. **Codex disclosure:** the submission explains what existed before the hackathon and what was built during it.
17. **Coverage honesty:** label comprehension may be broader than regulatory coverage; the UI states the difference per item.
18. **Predecessor security:** the legacy n8n workflow remains disabled and permanently outside the new architecture; its exposed Meta credential is revoked/rotated and its raw export is never committed or shipped.
19. **Cloudflare deployment:** every submitted runtime component is deployed on Cloudflare; OpenAI remains the external model API and Meta remains the WhatsApp provider.

---

## 4. Scope lock

### 4.1 Must ship

#### Citizen web

- public mobile-first landing page;
- anonymous first-use language selection and persistence;
- Settings: change language, read-aloud preference, compact view, delete/reset;
- camera, file upload, paste, and precomputed samples;
- one live Terra analysis path;
- result page for one to six products;
- category-specific coverage badge and mixed-category results;
- evidence badges, citations, uncertainty, and retake state;
- experimental front-of-pack panel with permanent disclaimer;
- claim audit and localized plain-language explanation;
- read-aloud using device voices;
- optional editable grievance draft;
- allow-listed next-service guidance: FSSAI/FoSCoS, BIS Care, NCH, or another verified route;
- expiring signed share/report link;
- graceful live-model failure with working cached samples.

#### WhatsApp

- direct Meta webhook on Cloudflare Workers;
- verified Meta GET token and raw-body POST signature;
- D1 idempotency, private temporary R2 media, Analysis Queue, and Delivery Queue;
- first-contact language menu and saved language;
- one-image input;
- inbound-message idempotency;
- fast acknowledgement plus one background Jobs Worker consuming Analysis and Delivery Queues;
- localized overview and numbered items;
- stored item details and signed web report;
- grievance draft command;
- Change language and Delete my data commands;
- no duplicate model call on webhook replay.
- no n8n, Gemini, shared memory, legacy prompt, or embedded credential.

#### Trust and public-interest proof

- compact verified food, cosmetics, and general-pack rule context plus public thresholds/services pages;
- package-versus-web provenance;
- simple versioned cache;
- exact seeded synthetic licence/recall matches;
- minimal searchable registry;
- minimal read-only officer dashboard;
- honesty and built-with pages;
- measured latency, web-search use, and estimated model cost.

#### Demo safety

- three precomputed schema-valid hero samples;
- at least one multi-product sample;
- at least one cosmetic and one household/personal-care sample porting and revalidating predecessor scenarios;
- one unreadable/unknown sample;
- no real personal/order data;
- no recorded accusation against a real brand.

### 4.2 Required but intentionally minimal

| Surface | Minimum acceptable implementation |
|---|---|
| Registry | Search seeded/observed products, open product, see evidence/source and scan count |
| Officer | Repeated AI-generated leads, claim candidates, unknown rate, synthetic matches; no map |
| Grievance | Editable/copyable/downloadable draft with evidence checklist and verified category-appropriate destination link |
| Languages | All catalogues render; deeper human/visual QA for English, Hindi, Marathi, Urdu |
| Read-aloud | Device speech engine only; hide when a compatible voice is unavailable |
| Multi-product | Up to six products; larger images return truncated with guidance |
| Category coverage | Food plus revalidated predecessor non-food scenarios; show label-only mode when specialist rules are unavailable |

### 4.3 Explicitly out

- live government licence, recall, grievance, OTP, or docket integration;
- real grievance submission or simulated government tracking;
- official or compliance-grade INR scoring;
- generic health score and product recommendations;
- medical, allergy, pregnancy, or dietary personalization;
- medicines, medical devices, clinical advice, and any high-stakes category without a verified pack;
- accounts, synced history, or silent web/WhatsApp identity linking;
- location collection or inference;
- large administrative workflow;
- crop/segment/parser pipelines;
- production-only lease, heartbeat, reaper, event-sourcing, and artifact-lineage infrastructure;
- automatic model retries or a second model call.

### 4.4 Stretch only after every must-ship gate is green

- richer officer visualizations;
- registry formulation/version history;
- more than six products;
- PWA/offline polish;
- explicit consented cross-channel linking;
- mock grievance adapter, clearly labelled as simulation;
- deeper category-specific regulatory packs and service routes.

---

## 5. Architecture lock

~~~text
web or verified Meta WhatsApp webhook
    → Cloudflare OpenNext Worker and shared Front of Pack API
    → anonymous saved profile and language
    → decode-validate original bytes, hash, private temporary R2 object
    → versioned cache lookup
       ├─ fresh hit: zero model calls
       └─ miss: publish small metadata to Cloudflare Analysis Queue
          → Queue consumer: ONE GPT-5.6 Terra Responses request
          whole image
          + strict structured output
          + compact verified category rules and service directory
          + optional hosted web search
    → mechanical validation
       schema + limits + evidence + returned citations
       + enabled rule/service IDs + experimental/wording policy
    → validate category coverage and allow-listed service route
    → exact local registry and synthetic licence/recall lookups
    → store complete analysis JSON
    → render the same localized result
       ├─ mobile web
       └─ Cloudflare Delivery Queue → WhatsApp
    → delete temporary R2 media and delivery context
    → optional draft generated from stored fields, no model call
~~~

Application code does not re-decide or paraphrase Terra's semantic result.

### Minimal persistence

- profiles;
- profile identities;
- analyses/cache in D1;
- scan requests;
- products;
- encrypted short-lived WhatsApp jobs in D1;
- private temporary R2 objects;
- Cloudflare Analysis and Delivery Queues;
- versioned JSON for category rules, service routes, and synthetic government data.

The detailed contract is in [LLD.md](./LLD.md).

### Cloudflare account and billing boundary

The supplied billing screenshot shows active Cloudflare Startup credits with USD 3,000 remaining and an expiry of 21 August 2027. It also states that Registrar purchases and AI Gateway are excluded from those credits. Therefore:

- use Workers/OpenNext, D1, R2 and Queues under the credited Cloudflare account;
- call the OpenAI Responses API directly; AI Gateway is unnecessary;
- treat a domain purchase as a separate out-of-pocket cost;
- deploy immediately to `workers.dev`, then attach a custom domain when available;
- never let domain procurement block the required public browser link;
- verify actual credit application and service caps in billing rather than assuming every Cloudflare charge is covered.

The competition permits this stack: it requires a live public browser link and allows other tools/libraries when owned/licensed and disclosed. It does not prescribe Vercel, n8n, a particular database, or a particular domain registrar.

---

## 6. Required routes and proof points

| Route | Proof |
|---|---|
| / | Problem, remembered language, image input, samples |
| /scan/[id] | Complete one/many-product result |
| /settings | Change/reset anonymous preferences |
| /grievance/[itemId] | Editable unsubmitted draft |
| /registry | Searchable public evidence registry |
| /product/[slug] | One evidence-backed product view |
| /officer | Minimal aggregate human-review leads |
| /thresholds | Enabled rules, sources, draft/in-force status |
| /services | Verified category-to-service routes and limitations |
| /honesty | Data boundaries, uncertainty, cost, limitations |
| /built-with | Dependencies, Codex contribution, reused-vs-new disclosure |
| /api/profile | Get/update/delete saved preferences |
| /api/scans | Idempotent one-image analysis |
| /api/whatsapp | Direct verified Meta webhook and command/media intake |

---

## 7. Day-by-day execution

### 23 August — lock and de-risk

Build:

- disable the legacy n8n workflow, revoke/rotate the exposed Meta credential, and review account activity;
- initialize a new Front of Pack Git repository and commit the documentation-only baseline before copying or generating application code;
- approve HLD, LLD, and this final plan;
- lock compact AnalysisResult schema and prohibited wording;
- create verified category-rule and service-directory JSON with source links and policy status;
- create three fictional/neutral hero fixtures;
- scaffold Next.js/OpenNext for Cloudflare Workers plus D1, private R2 and Queue bindings;
- spike one real Terra image request with strict output;
- spike name-only input with hosted web search;
- confirm WhatsApp credentials/test number.

Exit criteria:

- one clear package returns valid JSON from one Responses call;
- a name-only image searches inside the same response and returns traceable sources;
- model ID/access, latency, usage, and cost are recorded;
- every fixture validates locally;
- public `workers.dev` deployment skeleton opens on mobile;
- WhatsApp access is either confirmed or named the top blocker.
- predecessor hashes, ownership holds, and the reuse ledger are recorded without copying the raw workflow.

### 24 August — complete the web citizen loop

Build:

- anonymous profile and remembered language;
- Settings/reset;
- upload/camera/paste, decode validation, and original-resolution preservation;
- simple cache and explicit retry;
- result renderer, evidence badges, citations, unknown/retake states;
- experimental front-of-pack panel and disclaimer;
- read-aloud;
- grievance draft from stored fields;
- three precomputed sample paths.

Exit criteria:

- a fresh incognito user chooses Marathi once, refreshes, and does not choose again;
- one fixture journey works end to end at 360px;
- one live image returns through the same renderer;
- cache hit makes zero model calls;
- invalid model output fails without repair;
- terminal code deletes the private R2 image; one-day lifecycle eligibility is documented only as a non-exact orphan backstop.

### 25 August — WhatsApp must-have

Build:

- implement the direct Cloudflare Worker Meta webhook;
- signature verification, D1 idempotency and fast Queue-backed acknowledgement;
- keyed WhatsApp profile identity;
- language menu and persistence;
- inbound-message deduplication;
- encrypted short-lived D1 delivery context and private R2 media;
- Analysis Queue consumer calling the shared analyzer and Delivery Queue consumer sending stored output;
- localized overview, item detail, report link, draft command;
- Change language and Delete my data.

Exit criteria:

- an actual test-number image receives a localized result;
- a repeated webhook creates no duplicate job/call;
- web and WhatsApp render the same stored result contract;
- recipient/media data is deleted after delivery;
- timeout/failure produces an honest retry instruction.
- Analysis Queue redelivery cannot repeat a started Terra call; Delivery Queue retry never invokes Terra;
- no n8n workflow or legacy backend artifact exists in the deployment or repository.

If WhatsApp is not green by noon, stop all registry/officer depth and work only on WhatsApp plus the web core.

### 26 August — required supporting proof

Build:

- exact registry linkage and minimal search/product page;
- cosmetics/personal-care and general-pack coverage using new, ownership-verified fixtures that revalidate predecessor scenarios;
- FSSAI/FoSCoS, BIS Care, and NCH route validation;
- seeded synthetic licence/recall cards;
- minimal officer dashboard;
- thresholds, services, honesty, and built-with pages;
- complete all language catalogues;
- Urdu RTL and mobile/accessibility pass;
- rate limits and expiring signed reports.

Exit criteria:

- registry and officer surfaces work but are visibly secondary;
- synthetic data cannot be mistaken for live government data;
- every enabled rule and service route has a verified source and compatible category;
- all 12 language catalogues render without broken layouts;
- English, Hindi, Marathi, and Urdu complete manual smoke tests;
- built-with clearly separates pre-existing LabelSensei work from hackathon work.

### 27 August — reliability and release freeze

Build:

- full golden-fixture and one-call suite;
- five-person usability test focused on first-use comprehension;
- slow-network and low-cost Android checks;
- fix only citizen-blocking, trust, accessibility, WhatsApp, and submission defects;
- deploy release candidate;
- rehearse and record the two-minute video;
- prepare summary and disclosure.

Exit criteria by 8:00 PM:

- every demo action passes three consecutive clean runs;
- public URL works in incognito on phone and desktop;
- WhatsApp test-number flow passes;
- live analysis has an honest fallback;
- video is 1:55 or shorter before final title/end card;
- no critical or high-severity issue remains;
- release is frozen.

No new feature begins after noon.

### 28 August — submission buffer

By 10:00 AM:

- run final smoke test;
- verify public app and video permissions;
- verify sources, dependency/licence list, and disclosure;
- confirm no secret or PII is committed;
- produce final build and tag/hash record.

By 12:00 PM:

- submit;
- capture confirmation;
- re-open every submitted link from an incognito device.

The official 8:00 PM deadline is emergency buffer, not the target.

---

## 8. Go/no-go gates

| Gate | Pass condition | Failure action |
|---|---|---|
| Predecessor security | Legacy workflow disabled; exposed Meta credential revoked/rotated; account activity reviewed | Do not connect or reuse the WhatsApp infrastructure |
| Eligibility baseline | New Git history and docs-only baseline commit exist; every reused item is logged | Do not copy predecessor code/assets or claim hackathon novelty |
| Cloudflare platform | Workers Paid confirmed; OpenNext workerd/public Worker, D1, R2, both Queues, dry-run bundle and scoped secrets pass | Stop feature work and repair the platform; custom domain is not a blocker |
| Terra access | One image + strict schema succeeds | Use validated cached samples for demo; keep live path visibly beta |
| Hosted search | Returned sources can be programmatically verified | Disable web-derived conclusions; ask for back-of-pack photo |
| Async analysis | D1 → R2 → Analysis Queue → Terra → stored result completes within the Queue consumer limit | Reduce payload/schema; do not use `waitUntil()` or split into more model calls |
| Output stability | Golden fixtures pass consistently | Reduce schema/prompt scope and item limit, not evidence validation |
| Rule/service verification | Every enabled rule and route has an official source and compatible category | Disable the rule or route |
| WhatsApp | Direct Worker signature, media-ID, D1 idempotency, Queue and real test-number round trip pass | Drop supporting depth and finish the Cloudflare channel |
| Public deployment | Incognito mobile journey works | Stop feature work and fix deployment |
| Domain | Custom domain has TLS and no Access gate, or release remains on public `workers.dev` | Use `workers.dev`; never miss submission for domain procurement |
| Language quality | Core languages are understandable and layouts stable | Use reviewed fixed UI copy; retain AI disclosure for unreviewed text |

---

## 9. Two-minute judging script

The first minute is the citizen experience. The second explains architecture, trust, and public value.

| Time | Show/say |
|---|---|
| 0:00–0:08 | “The law and label data exist, but ordinary shoppers still do not have a usable front-of-pack interface.” |
| 0:08–0:15 | Open the public mobile site; show Marathi already remembered. |
| 0:15–0:24 | Upload one clear fictional packaged-food image. |
| 0:24–0:38 | Show the experimental panel, plain-language finding, and evidence badge. |
| 0:38–0:48 | Open claim-versus-evidence and a real rule/source citation. |
| 0:48–0:56 | Show a synthetic recall/licence card and its obvious demo warning. |
| 0:56–1:00 | Open the editable grievance draft and point out that it is not submitted. |
| 1:00–1:12 | Show the same kind of result through WhatsApp in the saved language. |
| 1:12–1:28 | Explain: one Terra response, whole image, optional hosted search, strict schema, zero/one-call cache. |
| 1:28–1:40 | Show package-versus-web provenance and an honest unknown/retake example. |
| 1:40–1:49 | Flash the minimal registry/officer signal: evidence-backed leads, not violations. |
| 1:49–1:56 | Show honesty/built-with: synthetic data, no government access, reused work, Codex contribution. |
| 1:56–2:00 | “One image, one response, one understandable public-service journey.” |

Use cached fictional samples during recording. A live scan can be shown separately only if it is stable. Never demonstrate a feature that does not work in the submitted public build.

---

## 10. Test matrix

### Golden inputs

1. clear single food package with visible front/back facts;
2. front-only package requiring web evidence;
3. physical image with three products;
4. cosmetic or personal-care label;
5. household or BIS-marked packaged product;
6. mixed-category cart/name-only screenshot;
7. unreadable/glare image;
8. covered label with no specialist route;
9. conflicting web sources;
10. no credible composition source;
11. more than six products;
12. adversarial text printed in artwork.

### Assertions for every applicable input

- product coverage and order;
- correct image/web/mixed/unavailable origin;
- returned hosted-search citation exists;
- rule ID is enabled and verified;
- category coverage is accurate and any service route is allow-listed;
- non-food items never receive the food-only experimental panel;
- selected-language output;
- experimental badge and disclaimer;
- no prohibited definitive wording;
- unknown when evidence is insufficient/conflicting;
- no second model request;
- no exposed PII;
- usable 360px layout.

### Mandatory call-count tests

- cache miss → one;
- cache hit → zero;
- six products → one;
- hosted search → one Responses request;
- invalid output → one then failure;
- timeout → no automatic replay;
- explicit Retry → one new attempt;
- WhatsApp replay → zero duplicate calls.

### Manual release matrix

| Area | Required coverage |
|---|---|
| Devices | Low-cost Android/mobile data, modern Android/iOS, desktop |
| Access | Camera, upload, paste, sample |
| Languages | Deep: en/hi/mr/ur; render smoke: all 12 |
| Accessibility | Keyboard, screen reader, focus, contrast, RTL, speech availability |
| Failures | Bad upload, unreadable, unsupported, rate limit, timeout, invalid output |
| Channels | Web first use/returning/settings/delete; WhatsApp first use/returning/replay/delete |
| Trust | Sources, experimental notice, synthetic notice, standing disclaimer, honesty page |

---

## 11. Submission checklist

- public browser link requires no access request or login;
- public link is a Cloudflare custom domain or `workers.dev` hostname with no Cloudflare Access gate;
- two-minute public video works in incognito;
- first minute demonstrates the citizen experience;
- written summary is under the competition limit;
- exact problem and affected citizen are stated;
- all demoed interactions work;
- dependencies and licences are listed;
- Codex use is meaningful and specifically described;
- pre-existing LabelSensei assets/code versus hackathon-built work are disclosed;
- new Front of Pack Git history and the reuse ledger substantiate that disclosure;
- the raw legacy n8n export and all n8n deployment code are absent;
- legacy Meta credentials are rotated and no secret appears in source, history, screenshots or evidence;
- Cloudflare app/Jobs Workers have least-privilege bindings and all secret values live only in Workers Secrets/Secrets Store;
- synthetic/mock data and unavailable integrations are disclosed;
- no official logo, government endorsement, live sensitive data, or credentials;
- official regulatory sources are linked;
- app works on mobile/slower connection;
- submission confirmation is retained.

Suggested reused-work disclosure structure:

| Before the hackathon | Built during the hackathon |
|---|---|
| Static LabelSensei landing site; WhatsApp/Gemini unstructured rating prototype; label-photo, WhatsApp and general multi-category learnings | Only execution-pipeline items marked DONE with redacted proof: new repository/app, completed Terra/evidence/language/service/registry/officer/channel work actually present in the release |

Only list work that is factually true at submission time.

---

## 12. Cut and stop rules

### Never cut

- public web citizen journey;
- remembered language and language change/delete;
- one-call invariant;
- baseline multi-category label understanding and verified service routing;
- evidence provenance and returned citations;
- experimental/non-official wording;
- honest unknown/failure behavior;
- WhatsApp working path;
- minimal registry;
- minimal officer page;
- honesty/built-with disclosure;
- mobile accessibility.

### Cut in this order

1. animation and visual flourishes;
2. officer chart variety and filtering;
3. registry version history and advanced search;
4. share images and rich print styling;
5. large-cart polish beyond six products;
6. PWA/offline behavior;
7. cross-channel linking;
8. mock grievance adapter;
9. deeper category-specific rules beyond the verified baseline.

The registry/officer **surfaces** remain because they are explicit product requirements; their depth is expendable.

### Stop conditions

- no new feature while a must-ship gate is red;
- no new feature after 27 August noon;
- remove a demo interaction after three consecutive failed clean runs;
- disable any rule without a verified official source;
- show missing evidence rather than fill it;
- retain separate channel profiles if linking is incomplete;
- prefer validated cached samples over a flaky live demo;
- after release freeze, make only submission-blocking fixes.

---

## 13. Major risks and mitigations

| Risk | Mitigation |
|---|---|
| Legacy n8n credential exposure | Disable workflow, revoke/rotate token, review activity, never commit raw export, and do not reuse n8n |
| Worker analysis outlives HTTP acknowledgement | Store private media in R2 and publish IDs to Cloudflare Queues; never depend on `waitUntil()` for Terra |
| Queue at-least-once redelivery duplicates billing | Include attempt number and require a D1 conditional provider claim; catch/ack every post-claim failure |
| Worker image normalization exceeds 128 MB/runtime support | Test maximum image under `workerd`; avoid native `sharp`; lower byte/dimension limit if needed |
| D1 result exceeds row limits | Cap all serialized analysis columns at 512 KB and reject before persistence |
| R2 lifecycle is not exact-time deletion | Delete explicitly in terminal/finally logic; hourly cleanup plus one-day eligibility are backstops |
| Cloudflare credits do not cover a product/registrar charge | Verify billable usage; domain is separate; `workers.dev` remains release-safe |
| Terra output too large/slow for many products | Six-item cap, compact schema, measured timeout, samples |
| Hosted search finds wrong variant | Provisional badge, exact identity evidence, unknown on ambiguity |
| Draft FOP policy presented as law | Permanent experimental label and validation gate |
| LLM invents citations/rules | Verify against tool-returned sources and enabled rule JSON |
| WhatsApp approval/setup delay | Confirm on day one; prioritize over secondary depth |
| Twelve-language quality varies | Reviewed fixed UI; deeper QA for four; disclose unreviewed AI wording |
| Broad categories weaken the pitch | Keep the recorded hero food/FSSAI-first; present other categories as platform leverage, not separate stories |
| Officer dashboard distracts judges | Keep it brief and after the citizen loop |
| Real-brand finding creates reputational risk | Fictional/neutral recorded samples and cautious wording |
| Public deployment/model outage | Precomputed schema-valid samples and honest live-status handling |
| Existing LabelSensei work creates eligibility ambiguity | Precise before/during disclosure on built-with and submission |

---

## 14. Source anchors

Product and judging:

- [Build What Moves India — brief](https://buildwhatmovesindia.com/brief)
- [Build What Moves India — FAQ](https://buildwhatmovesindia.com/faq)
- [LabelSensei](https://labelsensei.com/)

Regulatory and consumer-service context:

- [FSSAI Advertising and Claims Regulations compendium](https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Advertising_Claims_Regulations_04_10_2022.pdf)
- [FSSAI Labelling and Display compendium](https://www.fssai.gov.in/upload/uploadfiles/files/Comp_Labelling%20Display_Version%20VII_03042025.pdf)
- [FSSAI 2022 draft Front-of-Pack / INR proposal](https://comments.fssai.gov.in/Bestviewwl.aspx?NOTIFICATION_ID=4123)
- [FSSAI misleading-claims reporting information](https://fssai.gov.in/upload/uploadfiles/files/Press%20Release_Misleading%20Claims.pdf)
- [FoSCoS misleading-report form](https://foscos.fssai.gov.in/misleading-report)
- [Food Safety Connect FAQ](https://foscos.fssai.gov.in/consumergrievance/faqs)
- [FSSAI food-recall functionality order, 18 March 2026](https://www.fssai.gov.in/upload/advisories/2026/03/69bbb3b762053Order%20dt.%2018.03.2026_Implementation%20of%20Food%20Recall%20functionality%20in%20FoSCoS.pdf)
- [CDSCO Cosmetics Rules, 2020](https://www.cdsco.gov.in/opencms/opencms/en/Acts-and-rules/Cosmetics-Rules/)
- [BIS consumer protection and complaint routes](https://www.bis.gov.in/consumer-overview/consumer-protection/?lang=en)
- [BIS Care application](https://www.bis.gov.in/bis-apps/?lang=en)
- [National Consumer Helpline](https://consumerhelpline.gov.in/)
- [National Consumer Helpline — other department portals](https://consumerhelpline.gov.in/public/index.php/otherdeptgrievancesportal)

Technical:

- [GPT-5.6 Terra model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [Cloudflare Next.js/OpenNext on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

---

## 15. Final TL;DR

**Build one excellent citizen loop, not an AI bureaucracy.**

A user sets a language once on web or WhatsApp and sends one image. Cloudflare Workers accepts it, D1 provides idempotent state, private R2 holds it temporarily, and an Analysis Queue consumer makes one Terra Responses request for up to six supported packaged products. Terra may search when the label is incomplete, applies only verified category packs, and returns a localized structured result with an allow-listed service route when appropriate. The consumer validates evidence, citations, rules, route compatibility, experimental wording, and uncertainty; adds only exact registry and clearly synthetic licence/recall matches; stores the result; deletes the media; and renders it unchanged.

The hero remains an understandable food/FSSAI front-of-pack result. Cosmetics and other packaged categories are included as predecessor scenarios reimplemented and tested through the new Terra contract, while the UI stays honest about regulatory coverage. WhatsApp, languages, registry, and the officer page are required. The grievance is an optional editable draft, not a government submission. No crops, parse-list pipeline, per-product calls, second explanation call, or production-scale orchestration.

Freeze on 27 August. Submit by noon on 28 August.
