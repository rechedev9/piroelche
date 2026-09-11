# Piroboom

Website for Piroboom in Elche, built with Next.js, React, TypeScript, Tailwind CSS and shadcn/ui. Includes the 2026 catalogue reader, product and event enquiries, and store information.

## Run locally

Requires **Node 24+** and **pnpm 11.22.0**. From the project root, in Bash:

```bash
pnpm install --frozen-lockfile
LOCALAPPDATA="${LOCALAPPDATA:-$PWD/.local}" pnpm demo
```

Open **http://127.0.0.1:3000**. The demo uses labelled fixtures and a real local HTTP receiver on port **4010**, with synthetic submissions stored in private SQLite. The command above defaults its storage base to the ignored `.local/` directory. No business messages are sent. `Ctrl+C` stops both services.

To work with public content instead, use `pnpm dev`. To preview a production build:

```bash
pnpm build
pnpm start --port 3001
```

Open **http://127.0.0.1:3001**. Public content excludes demo products and cases; the default configuration keeps indexing and public form submissions disabled, with a telephone alternative.

## Work on the project

The code, tests and configuration are the source of truth:

- [src/](src/): routes, components and application logic.
- [content/site.json](content/site.json): editable content, validated by [content-schema.ts](src/lib/content-schema.ts).
- [.env.example](.env.example): optional server configuration; copy to `.env.local` when needed. The demo needs no env file.
- [package.json](package.json): commands and dependency versions.
- [tests/](tests/): unit, integration and browser expectations.
- [evidence/](evidence/): source manifests and historical verification artifacts.
- [docs/licenses/](docs/licenses/): font and component licenses.
- [docs/architecture.md](docs/architecture.md): module boundaries, data lifetime and regression checks.
- [docs/seo.md](docs/seo.md): indexing gate, metadata, structured data and AI-crawler files.

Content edits require rebuilding and restarting a production preview. Validate them with `pnpm validate:content`; keep example inventory in `fixtures/`.

The catalogue importer is prepared for a private Google Drive folder. It downloads and validates `catalogo.pdf`, then generates its cover, page images, searchable text and navigation together. Setup and the editor's instructions are in [docs/catalogue-sync.md](docs/catalogue-sync.md). Synchronization remains disabled until Drive and hosting are configured; the daily scheduled task is deferred and is not included.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium firefox webkit
LOCALAPPDATA="${LOCALAPPDATA:-$PWD/.local}" pnpm test:e2e
```

[Playwright](playwright.config.ts) starts fresh demo and public servers on **3000** and **3001**, using a separate `.next-e2e-demo` directory for the demo. Reusing servers requires `E2E_REUSE_SERVERS=1`; both must run the current code and the demo must have its receiver configured. Browser reports are written to `playwright-report/` and `evidence/playwright-results.json`.

If a development server already occupies those ports, run an isolated check:

```bash
LOCALAPPDATA="$PWD/.local/e2e" E2E_DEMO_PORT=3100 E2E_PUBLIC_PORT=3102 \
  REVIEW_RECEIVER_PORT=4110 E2E_REPORT_DIR=.local/e2e-report pnpm test:e2e
```

Measure the initial HTML and JavaScript of a running production build with `pnpm exec tsx scripts/measure-delivery.ts http://127.0.0.1:3001`. An optional second argument writes the JSON report to a file.

[GitHub Actions](https://github.com/rechedev9/piroelche/actions/workflows/ci.yml) runs the quality lane on Ubuntu (dependency advisories, types, lint, unit tests and a production build) and lints the workflows with a pinned actionlint when they change. Browser tests are not part of CI: run `pnpm test:e2e` locally. The configuration is in [.github/workflows](.github/workflows).
