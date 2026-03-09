# Contributing to FunversarialCV

Thanks for your interest in contributing. This document covers setup, practices, and where to find implementation details.

## Development setup

```bash
cd frontend && npm install && npm run dev
```

- **Run tests:** `npm test`
- **Run E2E tests:** `npm run test:e2e` (starts dev server if needed; requires Playwright: `npx playwright install chromium`). For faster local runs, start the dev server in another terminal and E2E will reuse it.
- **Generate E2E fixtures:** `npm run gen:e2e-fixtures` (writes `e2e/fixtures/minimal.pdf` and `minimal.docx`)
- **Lint:** `npm run lint`

## Practices

- **TDD:** Write tests first, then implement until tests pass. Apply to every feature and fix (eggs, API route, helpers, UI behavior where testable).
- **Feature branches:** All work happens on a feature branch (e.g. `feature/...`, `fix/...`). Never commit directly to `main`; merge via PR or after review.

## Where to look

- **Implementation details and phase breakdown:** [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- **Egg interface and registry:** [frontend/src/types/egg.ts](frontend/src/types/egg.ts), [frontend/src/eggs/registry.ts](frontend/src/eggs/registry.ts)
- **API contract (POST /api/harden):** [docs/API.md](docs/API.md)
