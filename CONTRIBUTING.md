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
- **Generate E2E fixtures:** `npm run gen:e2e-fixtures` (writes `e2e/fixtures/minimal.pdf` and `minimal.docx`)

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

### Optional local git hook

- To automatically run unit tests and lint before pushing:
  - Make sure `scripts/pre-push.sh` is executable.
  - From the repo root, create a symlink:\n
    ```bash\n
    ln -s ../../scripts/pre-push.sh .git/hooks/pre-push\n
    ```\n
  - This will run `npm test`, `npm run lint`, and (for branches matching `feature/*-critical`) the Playwright smoke tests before each `git push`.

## Where to look

- **Implementation details and phase breakdown:** [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- **Egg interface and registry:** [frontend/src/types/egg.ts](frontend/src/types/egg.ts), [frontend/src/eggs/registry.ts](frontend/src/eggs/registry.ts)
- **API contract (POST /api/harden):** [docs/API.md](docs/API.md)
