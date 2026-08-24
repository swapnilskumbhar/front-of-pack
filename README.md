# Front of Pack

Consumer-first package-label intelligence for web and WhatsApp. A user uploads one image, receives one localized analysis covering up to six products, and can follow validated consumer-service routes. Terra reads and researches the label once; a versioned engine owns red warnings, RDA arithmetic and the reproducible experimental rating.

## Local development

Requires Node.js 20.9 or newer.

```powershell
npm install
npm run dev
```

The public app requires no secret during the current foundation phase. Example templates are safe to commit; real `.dev.vars` files are ignored.

Immediately before the local Terra integration test, create the private Jobs Worker secret file:

```powershell
Copy-Item workers/jobs/.dev.vars.example workers/jobs/.dev.vars
notepad workers/jobs/.dev.vars
```

The OpenAI key belongs only to that private Jobs Worker file and must never be exposed through a `NEXT_PUBLIC_` variable, root `.dev.vars`, or the public app Worker.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm --prefix workers/jobs run typecheck
npm --prefix workers/jobs test
```

## Cloudflare

The public Next.js application is adapted with OpenNext for Cloudflare. The independent Jobs Worker owns model and WhatsApp delivery secrets.

```powershell
npm run preview
npm run cf-typegen
```

`npm run deploy` is intentionally a separate, explicit production action. Provision D1, R2, and Queues and add their generated IDs to the Wrangler configurations before deploying.

Architecture and delivery decisions live in [`docs/`](docs/).
