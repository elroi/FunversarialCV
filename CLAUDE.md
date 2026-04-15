# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `frontend/`:

```bash
npm run dev          # Start dev server
npm test             # Jest unit tests
npm run lint         # Next.js/TypeScript lint
npm run test:e2e     # Full Playwright E2E suite (starts dev server if needed)
npm run build        # Production build
```

**Run a single Jest test file:**
```bash
npm test -- src/eggs/InvisibleHand.test.ts
```

**Run E2E smoke tests only (faster):**
```bash
npx playwright test e2e/specs/smoke.spec.ts e2e/specs/happy-path.spec.ts
```

**Generate fixtures:**
```bash
npm run gen:e2e-fixtures      # E2E DOCX/PDF fixtures
npm run gen:research-fixtures # Research DOCX fixtures
```

## Architecture

The repo is a monorepo with one active package:
- `frontend/` — Next.js 14 (App Router) application, deployed to Vercel as a serverless app
- `packages/privacy-analytics/` — standalone package (see its own README)
- `docs/` — design, brand, and implementation reference docs

### Request flow

1. **Browser:** User uploads a `.docx` → client-side **dehydration** (`src/lib/clientVault.ts`) replaces PII with tokens (Stateless Vault pattern) → dehydrated buffer sent to server
2. **API route `POST /api/harden`** (`app/api/harden/`) — receives the dehydrated docx, runs the **Processor** (`src/engine/Processor.ts`) which applies selected eggs in sequence, returns base64-encoded output (optional `includePdfExport` adds a server-built PDF in the JSON response; see `docs/API.md`)
3. **Browser:** Client receives the output, **rehydrates** PII tokens back into the document, triggers download

### Egg plugin system

Every feature is an "Egg" — a plugin implementing `IEgg` (`src/types/egg.ts`):
- `id`, `name`, `owaspMapping`, `transform(buffer, payload): Promise<Buffer>`, `validatePayload(payload): boolean`
- Eggs live in `src/eggs/` and are registered in `src/eggs/registry.ts`
- Current eggs: **InvisibleHand** (LLM01 prompt injection, white 0.5pt font), **MetadataShadow** (LLM02, custom DOCX properties), **IncidentMailto** (creative mailto hyperlink), **CanaryWing** (LLM10, trackable ping token)

### Audience system (dual-copy)

The app renders two distinct audiences — **security** (technical) and **HR** (plain English) — without a page reload:
- `AudienceContext` (`src/contexts/AudienceContext.tsx`) holds the current audience
- All UI strings are typed in `src/copy/types.ts` (`Copy` interface) with implementations in `src/copy/security.ts` and `src/copy/hr.ts`
- `AudienceCopyFadeShell` handles the crossfade animation

### Engine internals (`src/engine/`)

- `Processor.ts` — orchestrates dehydration → duality check → egg transforms → rehydration
- `dualityCheck.ts` — pre-injection scanner that detects existing prompt-injection patterns in the user's CV
- `docxInject.ts`, `docxCanary.ts`, `docxMailto.ts` — DOCX-specific transform helpers

### API routes

- `POST /api/harden` — main egg injection pipeline (rate-limited)
- `GET /api/canary/[...token]` — canary hit recording when a trackable URL is followed (process-local ring buffer, rate-limited)
- `GET /api/canary/status` — check recent canary hits for a token
- `GET /api/lab/config`, `POST /api/lab/extract`, `POST /api/lab/complete` — Validation Lab (stateless; completion env-gated); see `docs/API.md`
- Extension point for durable canary storage: `src/lib/canaryHits.ts` → `persistCanaryHit`

### Key design constraints

- **Stateless / zero-retention:** Files are never written to disk; all processing is in-memory RAM only
- **PII Dehydration pattern:** Client-side vault (`clientVault.ts`) tokenizes PII before upload; server never sees raw PII
- **OWASP alignment:** Every egg must declare an `owaspMapping` from the `OwaspMapping` enum
- **No macros/scripts in parsers:** Use low-level DOCX/PDF parsers (`docx`, `jszip`, `pdf-lib`) only

## Development practices

- **TDD (hard requirement):** Write tests first, then implement minimal code to pass them
- **Never commit to `main`:** All changes go on `feature/...` or `fix/...` branches, merged via PR
- **Push = Push + open PR:** `gh pr create --base main --head $(git branch --show-current) --fill`
- **E2E audience note:** E2E tests assume the **security** audience by default (home loads HR). Call `ensureSecurityAudienceForE2e` in specs; use helpers from `e2e/helpers/security-ui.ts`

## Key reference docs

- Brand voice & tone: `docs/BRAND_COMMUNICATION_STRATEGY.md` + `docs/brand-guide.json`
- UI progressive-disclosure tiers: `docs/UI_STYLE_GUIDE.md`
- API contract: `docs/API.md`
- Implementation phases: `docs/IMPLEMENTATION_PLAN.md`
