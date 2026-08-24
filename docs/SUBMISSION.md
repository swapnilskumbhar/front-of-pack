# Front of Pack — submission package

> Drafted 24 August 2026. This is a preparation document, not proof that the submission is complete. No demo video has been recorded or uploaded, and no custom domain has been purchased or attached. Recheck every status below immediately before submitting.

The [official builder brief](https://buildwhatmovesindia.com/brief) sets the deadline at **28 August 2026, 8:00 PM IST**, with no grace period. It requires a public browser link, a video no longer than two minutes, and a project summary under 250 words. The [official FAQ](https://buildwhatmovesindia.com/faq) adds that every demonstrated feature must work, Codex must have contributed meaningfully, and mocks and limitations must be disclosed.

## Two-minute video shot list

Target a **1:55 final cut**. Record narration in English, keep the browser zoom readable on a phone-sized frame, and show no personal data, secrets, dashboards, or developer tools containing credentials.

Release gates before recording:

- Use a PII-free shopping-cart screenshot only after it completes the deployed journey. The repository's current six-product cart fixture is synthetic and has no image; do not present it as a real upload.
- The live Meta test-number journey has already completed end to end. Before recording, rehearse the exact owned image again, verify intake, analysis, and delivery, and keep secrets, recipient identifiers, logs, and dashboards out of frame. If the channel is temporarily unavailable, use the web-only alternate shot and describe the interruption accurately.
- Show only release behavior that has passed the final regression suite. In particular, marked red warnings and the score must come from published engine rules, not model-authored severity.

| Time | Screen and action | Narration cue |
|---|---|---|
| 0:00–0:08 | Open the public homepage in a clean browser. | “A label shows one serving; shoppers need to know what the whole pack means and what evidence supports it.” |
| 0:08–0:18 | Choose an owned, PII-free cart screenshot from the file picker—no camera permission or physical pack required. | “One image can start the citizen journey, including a shopping screenshot with several products.” |
| 0:18–0:42 | Open the AloFrut cached demonstration and frame the whole-bottle result: 31.5 g added sugar, about 63% RDA; 678 mg sodium, about 33.8%. Expand the supporting evidence briefly. | “The serving panel hides the bottle-level picture. Front of Pack shows the arithmetic, the source, and uncertainty together. This labelled demo is cached; clicking it makes no model call.” |
| 0:42–0:58 | **Primary cut:** send the same owned image to the live Meta test number and show the returned English brief. **Outage fallback:** open the editable grievance draft and show that the citizen—not the prototype—submits it through the official service. | Primary: “The same result reaches WhatsApp; English is the default unless the user chooses another supported language.” Fallback: “The prototype prepares confirmed facts, but never files a complaint or invents a docket.” |
| 0:58–1:00 | Clean cut to `/how-we-decide`. | “Here is why the result is defensible.” |
| 1:00–1:16 | Show the warning legend, rule links, formula, and deduction arithmetic. | “The model reads labels and explains them. Published code alone raises marked warnings and computes comparison numbers.” |
| 1:16–1:32 | Show a simple architecture frame or the transparency flow: image → one GPT-5.6 Terra response → validation → deterministic engine → web/WhatsApp. | “A fresh image uses one model response. Evidence links are validated; calculations re-run without another model call; exact cache hits use zero model calls.” |
| 1:32–1:46 | Show the synthetic registry label and grievance disclaimer. | “There is no live government connection. Registry records are synthetic, and official portals are external handoffs.” |
| 1:46–1:52 | Briefly show the repository history and tests. | “Codex helped turn the product constraint into typed contracts, security boundaries, deterministic rules, and regression tests.” |
| 1:52–1:55 | Return to the independence notice. | “Front of Pack is an independent educational prototype—not an official, medical, or legal decision.” |

## Project summary — 205 words

Indian shoppers can read a serving on a package, but understanding the whole pack, checking a claim, and deciding whether an official consumer-service route is relevant requires them to interpret dense labels and navigate disconnected FSSAI, BIS, and National Consumer Helpline pages. Front of Pack turns one package photo into an evidence-backed citizen brief.

The working browser journey accepts a JPG, PNG, or WebP image, reads up to six products, keeps package and online provenance separate, and shows whole-pack nutrition, printed or clearly calculated %RDA, allergens, ingredient context, claim checks, limitations, and source links. A versioned decision engine re-derives published warnings and rating deductions after one GPT-5.6 Terra response, so exact cached results need no second model call. English is the default, with twelve supported response languages.

This is better than a score-only scanner because every marked warning remains auditable and uncertainty stays visible. It also offers a clearly labelled synthetic registry demonstration and an editable grievance draft that the citizen reviews and submits independently through an official service. It never queries a government registry or files a complaint.

The public web prototype runs on Cloudflare Workers. The live Meta WhatsApp journey has completed end to end; mocked Graph-client tests separately cover transport edge cases.

## Codex contribution answer

Use this answer only after the final release checks confirm every listed implementation claim:

> Codex was a product and engineering collaborator throughout the new Front of Pack repository. I used it to audit predecessor scope, turn safety constraints into architecture, and implement the Next.js/OpenNext application, one-call GPT-5.6 Terra pipeline, strict evidence validation, deterministic decision engine, Cloudflare D1/R2/Queue lifecycle, direct WhatsApp transport, and regression tests. The pivotal decision was a narrow authority boundary: the model reads labels, researches matched public sources, and writes explanations; published code alone raises marked warnings and computes comparison numbers. Codex tested that constraint against real fixtures, exposed failures such as language-dependent ordering and duplicate sodium signals, and documented the trade-offs. I retained control of the problem definition, credentials, external actions, compliance claims, and final release decisions.

## Release truth table

| Surface | Current submission truth | What may be demonstrated |
|---|---|---|
| Public web application | A `workers.dev` deployment and production web scan/cache proof are recorded in the project runbook. Treat `https://front-of-pack.front-of-pack-jobs-worker.workers.dev` as a candidate link until it passes the final incognito check. | Live upload, result, evidence, transparency page, registry demonstration, and grievance drafting after a clean rehearsal. |
| Analyzer and storage | OpenAI Responses, hosted search, D1, private R2, Images, and Queues are implemented; the runbook records a one-call production upload and a zero-call exact cache hit. | Re-run the production smoke before recording; do not imply every cached demo is a fresh model call. |
| Cached product demonstrations | Three demonstrations use real package photographs and cached results. Clicking a demo makes no model call. The six-product cart fixture is synthetic and currently has no image. | Label each cached/synthetic state on screen and in narration. |
| Registry | Public exact-match feature backed by two local synthetic records. It does not verify an FSSAI or BIS identifier. | Show only as a synthetic demonstration. |
| Grievance | Working local editable draft with official external handoff links. It does not authenticate, submit, register, or track a grievance. | Show drafting and the disclaimer; never claim submission success. |
| Officer dashboard | Implemented as a restricted, redacted aggregate view, but production demo credentials are currently unset and it fails closed. | Exclude unless mock credentials are configured, tested, and supplied privately to reviewers. Reviewers judge the citizen journey, so this is optional. |
| WhatsApp | Webhook, encrypted routing, queues, renderer, language profiles, and mocked Graph tests are implemented. A real Meta test-number journey has completed end to end; a profile with no saved language defaults to English. | Rehearse the exact shot immediately before recording. If the channel is temporarily unavailable, use the fallback and disclose the interruption without describing the implementation as mock-only. |
| Government systems | No live government API, registry, login, OTP, payment, complaint submission, or case tracking is connected. Public official pages are used only as cited sources and external handoffs. | State this plainly. |
| Custom domain | None is claimed. A custom domain is optional; the `workers.dev` host is the fallback. | Submit whichever public link passes the final no-access check. |
| Demo video | None exists yet. | Record, upload, and verify the final ≤2:00 public link before submitting. |

## Compliance checklist

The organizers require an independent build, synthetic data where production access is unsafe, no live government interference, no sensitive personal data, and honest disclosure of mocks and dependencies ([brief](https://buildwhatmovesindia.com/brief#what-not-to-do), [FAQ](https://buildwhatmovesindia.com/faq)).

- [x] No code integrates with, authenticates to, tests transactions against, reverse-engineers, or interferes with a live government system or undocumented private API. It reads ordinary public source pages only for citation and handoff.
- [x] The registry uses exact local synthetic records and labels them “synthetic demonstration” and “not a live government query.”
- [x] The grievance tool produces an editable local draft only; the citizen must use [FSSAI FoSCoS](https://foscos.fssai.gov.in/consumergrievance/), [BIS Care](https://www.bis.gov.in/bis-apps/?lang=en), or the [National Consumer Helpline](https://consumerhelpline.gov.in/) directly when appropriate.
- [x] No government branding asset is used to imply that Front of Pack is official, approved, or endorsed. Product-label photographs are evidence, not application branding.
- [x] Demo fixtures contain no real Aadhaar, PAN, password, OTP, payment, health, or other sensitive personal information.
- [x] The public registry response and grievance page disclose their simulated/external-handoff boundaries.
- [x] The root layout renders the independence notice on every routed page.
- [x] The homepage's “Live · WhatsApp” claim is supported by a completed end-to-end journey through the real Meta test number.
- [ ] Rehearse the exact WhatsApp shot immediately before recording and use the disclosed fallback if the channel is temporarily unavailable.
- [ ] Confirm ownership or permitted use of every product photograph, icon, font, library, and other third-party asset; record required attributions.
- [ ] Confirm the final cart screenshot is owned, cropped of names, addresses, phone numbers, order IDs, and payment details, and not the image-less synthetic fixture.
- [x] Regression tests prove model-origin prose cannot become red, structured topics prevent unsafe nutrient merges, and the score/deductions reproduce from engine signals.
- [ ] Run a secret scan and verify that no `.dev.vars`, API token, recipient identifier, password, or credential appears in Git, screenshots, narration, logs, or the video.

## Pre-submit checklist

### Build and public link

- [ ] Run `npm test`, `npm run lint`, `npm run typecheck`, `npm --prefix workers/jobs test`, and `npm --prefix workers/jobs run typecheck` on the release commit.
- [ ] Re-run the AloFrut regression: added sugar appears once at about 63%; sodium appears once at about 33.8%; only engine-derived marked warnings are red; model additive context remains visible but not red; deduction arithmetic is shown.
- [ ] Complete three clean citizen journeys from a fresh incognito browser with cache disabled where relevant.
- [ ] Open the candidate `workers.dev` link from a separate network/device and confirm no Cloudflare Access, login prompt, broken asset, mixed-content warning, or expired result link blocks reviewers.
- [ ] Ensure the public repository is judge-accessible and its README contains setup, test, mock-data, and limitation instructions.
- [ ] If a custom domain is desired, purchase and attach it only with explicit approval, then test TLS and redirects. No custom domain currently exists, and it is not required by the official rules.

### Video and form

- [ ] Record and edit the video to 1:55 or less; verify the actual player duration is no longer than 2:00.
- [ ] Upload it to a public link that opens without requesting access. No video link currently exists.
- [ ] Watch once muted for readable captions and once with audio for accurate narration; confirm the first minute is citizen demo and the second explains the build and choices.
- [ ] Copy the 205-word summary exactly; do not add text that pushes it to 250 words or more.
- [ ] Paste the Codex contribution answer only after validating its claims against the release commit.
- [ ] Use the same registered email throughout. If submitting as a team of two, both people must register and provide each other's registered email; leave the partner field blank if solo.
- [ ] Submit before **28 August 2026, 8:00 PM IST**; target noon to preserve recovery time.

### Credentials and post-judging cleanup

- [ ] Never put OpenAI, Cloudflare, Meta, webhook, encryption, or session secrets in the submission form. Reviewers need URLs and mock user credentials only when a visible feature requires login.
- [ ] If the officer dashboard is included, create a unique `OFFICER_DEMO_USER` and `OFFICER_DEMO_PASS`, verify the redacted view, provide those mock credentials privately in the form, and rotate or remove them after judging. Do not commit them or show them in the video.
- [ ] Before recording, review Meta account activity and confirm the intended test number, current scoped secrets, and a documented rollback plan. Keep all credentials out of Git, logs, screenshots, narration, and the video.
- [ ] Give reviewers only the test number and exact usage instructions; never disclose the access token, app secret, verification token, or encryption key.
- [ ] After judging, rotate or remove reviewer credentials and temporary Meta secrets, review access logs, retire temporary Meta setup, and preserve only redacted submission evidence.

## Official requirement sources

- [Build What Moves India — Builder brief](https://buildwhatmovesindia.com/brief)
- [Build What Moves India — Frequently asked questions](https://buildwhatmovesindia.com/faq)
- [Front of Pack repository](https://github.com/swapnilskumbhar/front-of-pack)
