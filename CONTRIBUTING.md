# Contributing to FunversarialCV

Thanks for your interest in contributing. This document covers setup, practices, and where to find implementation details.

## Development setup

```bash
cd frontend && npm install && npm run dev
```

- **Run unit tests:** `npm test`
- **Run lint:** `npm run lint`
- **Run E2E tests (full suite):** `npm run test:e2e` (starts dev server if needed; requires Playwright: `npx playwright install chromium`). For faster local runs, start the dev server in another terminal and E2E will reuse it.
- **Run E2E smoke tests only:** `npx playwright test e2e/specs/smoke.spec.ts e2e/specs/happy-path.spec.ts`
- **Generate E2E fixtures:** `npm run gen:e2e-fixtures` (writes `e2e/fixtures/minimal.pdf` and `minimal.docx`; v1 E2E use DOCX only)
- **Generate JD baseline fixtures:** `npm run gen:jd-baseline` (writes committed `e2e/fixtures/jd-baseline.docx` and `jd-baseline.txt`, and copies the same files to `frontend/demo-output/` for local side-by-side review; `demo-output/` is gitignored)
- **Homepage / copy changes:** Many E2E flows assume the **security** audience (home defaults to HR). After `page.goto("/")`, call `ensureSecurityAudienceForE2e` when asserting security copy. Security-audience matchers are centralized in `e2e/helpers/security-ui.ts` (derived from `src/copy/security.ts`). See `frontend/e2e/README.md`.

### Recommended local workflow

- **Before pushing a feature branch:**
  - Run `npm test` and `npm run lint` in `frontend`.
- **Before merging larger or risky changes:**
  - Run E2E smoke tests locally: `npx playwright test e2e/specs/smoke.spec.ts e2e/specs/happy-path.spec.ts`.
- **Rely on CI:**
  - GitHub Actions runs unit + lint for feature branches (`CI` workflow) and full E2E on `main` and PRs targeting `main` (`E2E Tests` workflow).

## Practices

- **TDD:** Write tests first, then implement until tests pass. Apply to every feature and fix (eggs, API route, helpers, UI behavior where testable).
- **Feature branches:** All work happens on a feature branch (e.g. `feature/...`, `fix/...`). Never commit directly to `main`; merge via PR or after review.
- **UI / progressive disclosure:** See `docs/UI_STYLE_GUIDE.md` (fold tiers, defaults, safe state on change); machine-readable tier IDs: `ui.disclosureTiers` in `docs/brand-guide.json`.

### Validation Lab protocol copy (`validationLabManualMirrorProtocol`)

`validationLabManualMirrorProtocol` in `frontend/src/copy/security.ts` and `frontend/src/copy/hr.ts` is parsed for the home page Validation Lab (`frontend/src/lib/validationLabProtocol.ts`). If the shape breaks, the UI falls back to plain paragraphs (different layout for the badge hint).

**Contract:**

1. Split the full string on **blank lines** (`\n\n`).
2. The **first block** is the headline: first line = title; if the second line starts with an em dash (—) or en dash (–), it becomes the subtitle; any further lines in that block form the description paragraph.
3. The **remaining text** (after the first block) is the step body: each step starts with a line matching `(1)`, `(2)`, … `(10)` (parenthesized number + space). Lines that do not match are **continuations** of the previous step.

**Verification:** From `frontend/`, run `npm test -- src/lib/validationLabProtocol.test.ts`.

## Git workflow

All changes go through a short, predictable flow:

1. **Start from `main`**
   - Update your local `main`:

     ```bash
     git checkout main
     git pull origin main
     ```

2. **Create a feature branch**
   - Use a descriptive name:

     ```bash
     git checkout -b feature/<short-description>
     # or for fixes:
     git checkout -b fix/<short-description>
     ```

3. **Develop and run tests locally**
   - In `frontend`:

     ```bash
     npm test           # Jest unit tests
     npm run lint       # Linting
     # Optionally for bigger changes:
     npm run test:e2e   # or the E2E smoke commands listed above
     ```

4. **Push the feature branch**

   ```bash
   git push origin feature/<short-description>
   ```

5. **Open a pull request into `main`**
   - On GitHub, open a PR with:
     - **base**: `main`
     - **compare**: your feature branch.
   - CI will automatically run:
     - `CI / unit-and-lint` (Jest + lint).
     - `e2e` (Playwright E2E).

6. **Merge only when checks are green**
   - The `main` branch is protected:
     - You cannot push directly to `main`.
     - The PR can only be merged once:
       - All required checks (`CI / unit-and-lint` and `e2e`) pass.
       - Any required review is complete.

This keeps `main` always in a deployable state while keeping the local developer experience simple.

### Optional local git hook

- To automatically run unit tests and lint before pushing:
  - Make sure `scripts/pre-push.sh` is executable.
  - From the repo root, create a symlink:

    ```bash
    ln -s ../../scripts/pre-push.sh .git/hooks/pre-push
    ```

  - This will run `npm test`, `npm run lint`, and (for branches matching `feature/*-critical`) the Playwright smoke tests before each `git push`.

## CI and GitHub workflows

GitHub Actions is configured to mirror the recommended local workflow:

- **CI workflow (`.github/workflows/ci.yml`)**
  - Triggered on:
    - `push` to any branch **except** `main`.
    - `pull_request` targeting `main`.
  - Jobs:
    - `unit-and-lint`:
      - `npm ci` in `frontend`.
      - `npm test` (Jest unit tests).
      - `npm run lint` (Next.js/TypeScript linting).

- **E2E workflow (`.github/workflows/e2e.yml`, named “E2E Tests”)**
  - Triggered on:
    - `push` to `main`.
    - `pull_request` targeting `main`.
  - Jobs:
    - `e2e`:
      - `npm ci` in `frontend`.
      - `npx playwright install --with-deps chromium`.
      - `npm run test:e2e` (full Playwright suite).

### Branch protection on `main`

The `main` branch is protected so that:

- All changes must go through a pull request.
- The following **required status checks** must be green before merging:
  - `CI / unit-and-lint`
  - `e2e` (E2E workflow)

If you add new workflows or change job names, remember to:

1. Let the new jobs run at least once on a PR into `main`.
2. Update the branch protection rule in **Settings → Branches** so the correct checks are required.

## Deployment environment variables

When deploying to Vercel (or another platform), configure the following environment variables as needed:

- `CANARY_BASE_URL` (optional): Base URL for Canary Wing links when not using the default derived from `VERCEL_URL`. If unset, the app falls back to the deployed origin.
- `CANARY_ADMIN_KEY` (optional): Secret key used to gate the internal `/admin/canaries` page. When set, requests must include `?key=<CANARY_ADMIN_KEY>` to view canary analytics.
- `RATE_LIMIT_HARDEN_MAX` / `RATE_LIMIT_HARDEN_WINDOW_MS` (optional): Override defaults for `/api/harden` rate limiting. Defaults are roughly “30 requests per 60 seconds per IP” when unset.
- `RATE_LIMIT_CANARY_MAX` / `RATE_LIMIT_CANARY_WINDOW_MS` (optional): Override defaults for `/api/canary` rate limiting. Defaults are roughly “120 requests per 60 seconds per IP” when unset.

These variables are read at runtime; if they are not set, the application falls back to conservative, in-memory defaults suitable for a low-volume Vercel deployment.

## Manual inspection: clean CV, injected CV, baseline JD

Use this flow when reviewing parser-visible egg behavior or demonstrating FunversarialCV to stakeholders:

1. Start from a **clean** CV (dehydrated tokens on the wire to `/api/harden`, never raw PII).
2. Run hardening and save the **injected** DOCX output from the app or API.
3. Open the committed synthetic job description **`frontend/e2e/fixtures/jd-baseline.txt`** (or `jd-baseline.docx`) as a **stable third document**. It is not a real opening; it anchors role context when you compare extracted text, metadata, and hyperlinks across artifacts.
4. Interpret diffs in two layers: **human-visible** body text and layout versus **machine-visible** signals (hidden paragraphs, custom properties, mailto/query parameters, canary URLs).
5. **API:** Omit `divergenceProfile` or send `balanced` for legacy behavior. Send `machine` for stronger parser-facing divergence with bounded visible change (the web UI defaults to `machine`). Send `visible` for demo-style visible canary styling. See [docs/API.md](docs/API.md).

## Where to look

- **Copy and brand:** [docs/BRAND_COMMUNICATION_STRATEGY.md](docs/BRAND_COMMUNICATION_STRATEGY.md) (voice, scope, trust messaging); [docs/brand-guide.json](docs/brand-guide.json) (machine-readable checklist for plans and agents—keep in sync with the strategy doc). Archived **input drafts** that were merged into the strategy: [docs/brand/drafts/](docs/brand/drafts/).
- **Implementation details and phase breakdown:** [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- **Egg interface and registry:** [frontend/src/types/egg.ts](frontend/src/types/egg.ts), [frontend/src/eggs/registry.ts](frontend/src/eggs/registry.ts)
- **API contract (POST /api/harden):** [docs/API.md](docs/API.md)
