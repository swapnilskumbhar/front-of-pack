# Front of Pack — Cloudflare Setup Runbook

> **Status:** authoritative onboarding runbook
> **Created:** 23 August 2026
> **Target:** Cloudflare Workers/OpenNext + D1 + private R2 + Analysis/Delivery Queues
> **External APIs:** OpenAI Responses API and Meta WhatsApp Cloud API
> **No n8n:** the legacy workflow remains disabled evidence only

---

## 1. What is free and what is not

### 1.1 The free hostname

Every deployed Worker can receive a hostname such as:

~~~text
front-of-pack.<account-subdomain>.workers.dev
~~~

The hostname itself has:

- no registration charge;
- no annual domain renewal;
- no separate request quota;
- no fixed one-year expiration while the Cloudflare account and Worker remain active.

The Worker plan controls request/CPU limits.

### 1.2 Worker plans

| Plan | Included requests | CPU | Fit for this project |
|---|---|---|---|
| Workers Free | 100,000 requests per day | 10 ms CPU per invocation | Useful only for a trivial skeleton; not the locked production target |
| Workers Paid/Standard | 10 million requests per month; then USD 0.30 per additional million | 30 million CPU-ms per month; then USD 0.02 per million; up to 5 minutes per invocation | Required target for the OpenNext app and Jobs Worker |

Workers Paid has a USD 5 monthly minimum. Queue consumers may run for up to 15 minutes wall time. Waiting on OpenAI network I/O is not CPU time, but image decoding, hashing, validation and rendering consume CPU/memory.

### 1.3 Startup credit

The supplied Cloudflare billing screenshot shows:

- USD 3,000 active Startup credits remaining;
- programme start 21 August 2026;
- expiry 21 August 2027;
- Registrar purchases and AI Gateway excluded;
- zero usage at the time of the screenshot.

The credit is a dollar balance for eligible Cloudflare charges, not a fixed number of requests. It lasts until the earlier of:

1. the eligible USD 3,000 being consumed; or
2. 21 August 2027.

Confirm Workers Paid/Standard activation and that charges draw from the credit on the first invoice. Do not assume an unlisted product is covered.

OpenAI API and Meta charges are separate from Cloudflare credits.

### 1.4 Custom domain

A purchased domain is not free under the shown credits.

- Registration is normally for one or more years.
- Renewal is charged per year at the current registry price.
- Cloudflare Registrar sells supported domains at registry/ICANN cost without markup.
- Registration and renewal are separate billable operations and are normally non-refundable.
- TLS certificates and attaching an owned Cloudflare-zone hostname to a Worker do not create a second Worker request quota.

A custom domain is recommended polish, not a submission dependency. Deploy to workers.dev first.

---

## 2. Current local prerequisites

Verified on this machine:

| Tool | State |
|---|---|
| Node.js | v24.18.0 |
| npm | 11.16.0 |
| Git | 2.39.2 |
| GitHub CLI | Not installed |
| Front of Pack Git repository | Not initialized |
| Front of Pack application | Not scaffolded |
| Current workspace | Documentation and supporting files only |

A GitHub repository is not required for the first Cloudflare deployment. Wrangler deploys the local project directly.

---

## 3. Safe setup order

Do not scaffold application code before the documentation-only baseline commit. That commit is eligibility evidence showing Front of Pack began as a new hackathon repository.

### Phase 0 — secure the predecessor

Before connecting the Meta test number:

1. Disable the legacy n8n workflow.
2. Revoke and rotate its exposed Meta token.
3. Rotate any reused n8n credential.
4. Review Meta activity.
5. Keep the raw export outside this repository.

Cloudflare platform/web work can begin while these user actions are completed. WhatsApp cannot.

### Phase 1 — initialize local Git

The implementation agent first creates a root .gitignore covering at least:

~~~text
node_modules/
.next/
.open-next/
.wrangler/
.dev.vars*
.env*
dist/
coverage/
*.log
setup-codex-api-key.bat
~~~

Then run from E:\projects\front-of-pack:

~~~powershell
git init -b main
git add .gitignore docs
git commit -m "docs: lock architecture and execution baseline"
git status
~~~

Acceptance:

- Git history starts in Front of Pack, not LabelSensei.
- First commit contains documentation only.
- No secret-bearing n8n export, user image, environment file or predecessor Git history exists.

### Phase 2 — optional GitHub remote

Because GitHub CLI is not installed, create an empty private repository in the GitHub website first. Do not initialize it with a README or licence.

Then:

~~~powershell
git remote add origin https://github.com/<owner>/front-of-pack.git
git push -u origin main
~~~

GitHub is optional for local Wrangler deployments. Add it when backup/automatic Cloudflare builds are useful.

### Phase 3 — create the Cloudflare/Next.js scaffold

The workspace is not empty, so do not run a generator directly over it.

Create a temporary official scaffold beside the workspace:

~~~powershell
Set-Location E:\projects
npm create cloudflare@latest -- front-of-pack-scaffold --framework=next
~~~

Choose:

- TypeScript;
- Next.js App Router;
- do not create another lasting Git history;
- do not deploy during generation.

The implementation agent then migrates the generated application/configuration into E:\projects\front-of-pack while preserving docs, records dependencies/licences, verifies the build, and removes the temporary directory only after validating its resolved path.

Expected root files include:

~~~text
package.json
package-lock.json
wrangler.jsonc
open-next.config.ts
cloudflare-env.d.ts
next.config.ts
tsconfig.json
app/
lib/
workers/jobs/
migrations/
~~~

### Phase 4 — authenticate Wrangler

From the Front of Pack directory:

~~~powershell
npx wrangler login
npx wrangler whoami
~~~

Wrangler opens Cloudflare OAuth in the browser. If the local callback does not work:

~~~powershell
npx wrangler login --device
~~~

Never paste an account API token into chat, documentation or Git.

Acceptance:

- whoami shows the intended Cloudflare account;
- credentials are local Wrangler credentials;
- no Cloudflare token exists in the workspace.

### Phase 5 — enable the required plan

In Cloudflare Dashboard:

1. Open Workers & Pages.
2. Confirm Workers Paid/Standard is active.
3. Confirm the USD 5 minimum and eligible charges can draw from Startup credits.
4. Set a conservative CPU limit for the Jobs Worker and monitor usage.
5. Do not enable AI Gateway; OpenAI is called directly.

The Free plan's 10 ms CPU limit is not the release target.

### Phase 6 — provision Cloudflare resources

Run after Wrangler authentication:

~~~powershell
npx wrangler d1 create front-of-pack
npx wrangler r2 bucket create front-of-pack-private-media
npx wrangler queues create front-of-pack-analysis
npx wrangler queues create front-of-pack-delivery
npx wrangler queues create front-of-pack-analysis-dlq
npx wrangler queues create front-of-pack-delivery-dlq
~~~

Add the returned D1 database ID and binding names to the two Wrangler configurations. The R2 bucket remains private and must not receive a public/custom domain.

Add the orphan lifecycle backstop:

~~~powershell
npx wrangler r2 bucket lifecycle add front-of-pack-private-media --expire-days 1
~~~

This makes old objects eligible for deletion after one day; it is not an exact 24-hour deletion promise. Application terminal/finally logic remains responsible for immediate deletion.

### Phase 7 — configure scoped secrets

Add secret values interactively. Do not put them on the command line.

Public OpenNext Worker:

~~~powershell
npx wrangler secret put PROFILE_HMAC_SECRET
npx wrangler secret put REPORT_LINK_SECRET
npx wrangler secret put DELIVERY_ENCRYPTION_KEY
npx wrangler secret put WHATSAPP_VERIFY_TOKEN
npx wrangler secret put WHATSAPP_APP_SECRET
npx wrangler secret put OFFICER_DEMO_USER
npx wrangler secret put OFFICER_DEMO_PASS
~~~

Jobs Worker:

~~~powershell
npx wrangler secret put OPENAI_API_KEY --config workers/jobs/wrangler.jsonc
npx wrangler secret put REPORT_LINK_SECRET --config workers/jobs/wrangler.jsonc
npx wrangler secret put DELIVERY_ENCRYPTION_KEY --config workers/jobs/wrangler.jsonc
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID --config workers/jobs/wrangler.jsonc
npx wrangler secret put WHATSAPP_ACCESS_TOKEN --config workers/jobs/wrangler.jsonc
~~~

The OpenAI and WhatsApp send tokens must not be bound to the public Worker. The webhook verification secrets must not be bound to the Jobs Worker.

For local development use one ignored .dev.vars file per Worker. Never commit either file.

### Phase 8 — migrate D1

After migrations/0001_initial.sql exists:

~~~powershell
npx wrangler d1 migrations apply front-of-pack --local
npx wrangler d1 migrations apply front-of-pack --remote
~~~

Acceptance:

- both migrations succeed;
- JSON validity and unique/idempotency constraints exist;
- the complete serialized analysis cap is 512 KB;
- no raw phone number or unencrypted delivery value is stored.

### Phase 9 — preview and deploy

Required local verification:

~~~powershell
npm run lint
npm run typecheck
npm test
npm run cf-typegen
npm run preview
npm run deploy:dry-run
~~~

Deploy:

~~~powershell
npm run deploy
~~~

The deployment script publishes:

1. the OpenNext web/API Worker;
2. the background Jobs Worker.

Wrangler assigns the public workers.dev hostname. Verify it in an incognito browser and ensure Cloudflare Access is not enabled.

### Phase 10 — optional custom domain

Only after workers.dev is green:

1. Search/check the exact domain and current registration/renewal price.
2. Stop for explicit purchase approval.
3. Register for the chosen term or add a domain bought elsewhere to Cloudflare DNS.
4. Attach the hostname under Worker Settings → Domains & Routes → Custom Domain.
5. Verify Cloudflare-issued TLS.
6. Keep workers.dev as the emergency release fallback.

Never automate a domain purchase without confirming the exact name, term and non-refundable price.

### Phase 11 — optional Git-based deployments

After pushing to GitHub, Cloudflare Workers Builds can connect the repository and deploy on pushes. This is optional; local Wrangler deployment is enough for the hackathon.

If CI is added:

- use a scoped Cloudflare API token stored as a GitHub secret;
- never commit the token or account secret;
- protect the release branch;
- keep preview and production environments separate.

---

## 4. Definition of connected

Cloudflare is connected when:

- Git has a documentation-only baseline commit;
- Wrangler whoami confirms the intended account;
- Workers Paid/Standard is confirmed;
- OpenNext preview succeeds in workerd;
- workers.dev is publicly reachable;
- local and remote D1 migrations pass;
- private R2 put/get/delete passes;
- Analysis and Delivery Queue round trips pass through the Jobs Worker;
- secret scans are clean;
- the public Worker lacks OpenAI/Meta send secrets;
- the Jobs Worker lacks unnecessary webhook/profile/admin secrets.

A custom domain is not required to satisfy this definition.

---

## 5. Official references

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Wrangler login and deploy](https://developers.cloudflare.com/workers/get-started/guide/)
- [Next.js/OpenNext on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [D1 Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Create an R2 bucket](https://developers.cloudflare.com/r2/buckets/create-buckets/)
- [Cloudflare Queues setup](https://developers.cloudflare.com/queues/get-started/)
- [Workers Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/)
- [Register a domain](https://developers.cloudflare.com/registrar/get-started/register-domain/)
- [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

---

## 6. Setup TL;DR

~~~text
secure old Meta/n8n credentials
→ create .gitignore
→ git init + documentation-only baseline commit
→ scaffold OpenNext without overwriting docs
→ npx wrangler login + whoami
→ confirm Workers Paid/credit coverage
→ create D1 + private R2 + Analysis/Delivery Queues
→ configure scoped Worker secrets
→ migrate local/remote D1
→ preview under workerd
→ deploy to workers.dev
→ optionally buy and attach a custom domain separately
→ optionally connect GitHub for automatic builds
~~~
