# FunversarialCV — Detailed implementation plan

This document expands the [review and next steps](.cursor/plans) into concrete implementation tasks for Phases 1–3. Stateless processing is unchanged: all work runs in-memory on the server; no persistence.

---

## Development practices (mandatory)

- **TDD:** Always write tests first, then implement until tests pass. Apply to every feature and fix (eggs, API route, helpers, UI behavior where testable).
- **Feature branches:** All work happens on a feature branch (e.g. `feature/api-harden`, `feature/metadata-shadow`, `feature/invisible-hand-ui`). Never commit directly to `main`; merge via PR or after review.

---

## Personas and plan alignment

The following personas shape acceptance criteria, edge cases, and documentation. Each phase is reviewed against their goals.

| Persona | Goal | Key concerns |
|--------|------|----------------|
| **Candidate** | Upload CV, configure eggs, download hardened file with confidence | Privacy (no retention), clear feedback (duality, errors), correct download, file type/size limits visible |
| **Recruiter** | Receive valid CVs; recognize “hidden layers” as signal | Output is standard PDF/DOCX; README explains what to look for |
| **AI/HR-tech developer** | Test parsers against known adversarial inputs | Stable API contract, predictable egg payloads, docs for each egg |
| **Security reviewer** | Verify no persistence, safe PII handling, no info leakage | Errors are generic where appropriate; no stack traces to client; logging server-side only |
| **Maintainer** | Extend eggs, fix bugs, onboard contributors | Testable API, clear types, README and in-code comments |

**Plan improvements driven by personas:**

- **Candidate:** Add explicit acceptance criteria for “download works and matches format”; show file size limit in UI (Phase 1); ensure duality copy is actionable (Phase 1). Invisible Hand card must clarify “optional, default used if empty” (Phase 2).
- **Recruiter:** No implementation change; keep README “For Recruiters” section; ensure format-preservation note is visible (Phase 3).
- **AI/HR-tech developer:** Document `/api/harden` request/response in README or OpenAPI snippet (Phase 3); optional `eggIds` helps reproducible tests (Phase 3).
- **Security reviewer:** API must return generic messages for 500 and avoid leaking stack traces; log errors server-side only; document “no persistence” in route comment (Phase 1). Add task: validate `payloads` keys against known egg ids to avoid unexpected server behavior (Phase 1).
- **Maintainer:** API route tests (Phase 3) and optional egg toggles improve testability; add a short “Contributing” or “Implementation” pointer to this doc in README (Phase 3).

**New / clarified tasks from personas:**

- **1.1 (API):** Validate `payloads` keys are subset of `AVAILABLE_EGGS.map(e => e.id)`; ignore unknown keys, do not fail. **Detect document type from buffer magic bytes (PDF %PDF, DOCX PK); reject if neither; optionally 400 if extension disagrees with detected type.** Return 400 with clear message for missing `file` or invalid/unsupported content. On 500, return `{ error: "Processing failed. Please try again." }` (or similar); log full error server-side only.
-- **1.2 (Page):** Show a file size hint near DropZone (e.g. “Max 4 MB” to match the API limit and Vercel’s request cap) so Candidate knows before upload. After download, clear or keep `error` state consistent (e.g. clear on new file select).
- **1.4 (Errors):** Ensure 400 messages are safe to show (no paths, no stack). Security reviewer: no internal details in response body.
- **3.1:** Add one-sentence “Implementation plan: see docs/IMPLEMENTATION_PLAN.md” (or CONTRIBUTING) for Maintainer.
- **3.3:** Promote API route tests from optional to recommended for Maintainer and Security reviewer confidence.
- **File type (Security):** Usability is determined by in-file properties (magic bytes: PDF `%PDF`, DOCX `PK`), not only by filename or `Content-Type`; API must enforce this.

---

## Phase 1 — Working E2E

### 1.1 API route: `POST /api/harden`

**File:** `frontend/app/api/harden/route.ts` (new).

**Practice:** TDD — write API route tests first (see 3.3), then implement the route. Work on a feature branch (e.g. `feature/api-harden`).

**Contract**

- **Request:** `multipart/form-data`
  - `file` (required): single PDF or DOCX. **Usability is determined by in-file content (magic bytes), not only by filename or `Content-Type`.** Same allowed extensions as DropZone (`.pdf`, `.docx`) for UX; server must re-validate from buffer.
  - `payloads` (optional): JSON string `Record<string, string>`. Keys = egg ids (`invisible-hand`, `incident-mailto`, `canary-wing`). If omitted, use `{}`.
- **Response (success):** JSON:
  - `bufferBase64: string`
  - `mimeType: string`
  - `scannerReport: { scan: ScanResult; alerts: string[] }`
  - `originalName: string`
  Client decodes base64, creates blob, triggers download; sets duality from `scannerReport.scan`.
- **Response (error):** `4xx`/`5xx` with JSON `{ error: string }`. Processor throws (unsupported type, payload validation) → 400; unexpected → 500.

**Steps**

1. `request.formData()` → get `file` with `formData.get("file")`. Reject if missing or not a File.
2. Buffer: `Buffer.from(await file.arrayBuffer())`. **Determine format from in-file properties (magic bytes), not from `file.name` or `file.type`:**  
   - PDF: `buffer.length >= 4 && buffer[0]===0x25 && buffer[1]===0x50 && buffer[2]===0x44 && buffer[3]===0x46` (`%PDF`).  
   - DOCX: `buffer.length >= 2 && buffer[0]===0x50 && buffer[1]===0x4b` (`PK`, ZIP/DOCX).  
   Set `mimeType` from detected format (`MIME_PDF` / `MIME_DOCX` from `engine/documentExtract`). If buffer matches neither signature, return 400 with a clear message (e.g. "Unsupported or invalid document: file must be a valid PDF or DOCX."). Optionally: if extension (from `file.name`) disagrees with detected type, return 400 (e.g. "File content does not match extension.") to avoid silent mislabeling.
3. Payloads: `formData.get("payloads")` as string → `JSON.parse` → `Record<string, string>`, default `{}`. On parse error → 400. **Persona (Security/Maintainer):** Filter payloads to keys that exist in `AVAILABLE_EGGS.map(e => e.id)`; ignore unknown keys.
4. `process({ buffer, mimeType, eggs: AVAILABLE_EGGS, payloads })` from engine + registry.
5. Return JSON: `result.buffer.toString("base64")`, `mimeType`, `result.scannerReport`, `file.name`. Do not persist.
6. Body size: rely on Next.js default for MVP; increase in `next.config.js` later if needed.

**Centralizing magic-byte checks:** The codebase already uses these signatures in InvisibleHand, IncidentMailto, and CanaryWing. For the API route (and consistency), add a small helper in `engine/documentExtract` or `lib/fileType.ts`: e.g. `detectDocumentType(buffer): SupportedMimeType | null` that returns `MIME_PDF`, `MIME_DOCX`, or `null`. Use it in the route; optionally use it inside Processor or eggs later to avoid duplication.

**Error responses (Security reviewer):** 400: include API `error` message (user-facing, no paths/stacks). 500: return generic `{ error: "Processing failed. Please try again." }`; log full error server-side only.

**Types:** `ScanResult` from `lib/Scanner`: `{ hasSuspiciousPatterns, matchedPatterns, details? }`.

---

### 1.2 Frontend: wire file to API and show result

**File:** `frontend/app/page.tsx`.

**Flow**

- **Two-step UX:** Selecting a file only "arms" it (stores in state); the user configures eggs via the config cards, then clicks a **Harden** button to run the pipeline. This allows configuring eggs before processing. See README "Using FunversarialCV."
- On **Harden** click: set `processingState = "processing"`, `activeStage = "accept"`, log "[ACCEPT] Buffer received...". Build FormData from armed file + current payloads, POST to `/api/harden`. Then: FormData appends `file` and `payloads` JSON; on success decode base64 → blob → trigger download, set duality result and completed log; on error set `error` and processing state.

**Candidate:** Clear `error` when user selects a new file. Optionally show file size limit near DropZone (e.g. “Max 4 MB”) if Next.js/Vercel limits are known.
Auto-trigger download on success; no need to keep buffer in state.

---

### 1.3 Duality result from API

Set `dualityResult` from `response.scannerReport.scan`. DualityMonitor already takes `DualityCheckResult` (= `ScanResult`). No component changes.

---

### 1.4 Error handling

- 413: "File too large".
- 400: show API `error` message (must be safe for Candidate — no paths or internals).
- Network failure: "Network error", `processingState = "error"`.
- 500: show generic message (e.g. "Processing failed. Please try again."); do not expose server details.

---

## Phase 2 — Parity with README and UX

### 2.1 Invisible Hand config card

**New file:** `frontend/src/components/InvisibleHandConfigCard.tsx`.

- Props: `payload`, `onPayloadChange`, `disabled?`, `className?`.
- Single textarea/input for optional trap text (max 500 chars). Placeholder/tooltip: **Candidate** must understand “Leave blank to use default system note.”
- Style consistent with `IncidentMailtoConfigCard` and `CanaryWingConfigCard`.
- Add `invisibleHandPayload` state on page and include in payloads sent to `/api/harden`.

### 2.2 Metadata Shadow (Option A — implement the egg)

Implement the Metadata Shadow egg and UI:

- **New egg** `frontend/src/eggs/MetadataShadow.ts` (OWASP LLM02: Insecure Output): payload JSON for custom document properties (e.g. `{ "Ranking": "Top_1%" }`). `validatePayload`: parse JSON; restrict keys to a safe allowlist (alphanumeric + underscore); values short, no PII. `transform`: set PDF metadata (pdf-lib document info / custom properties where supported); set DOCX custom properties (e.g. via docx or jszip `docProps/custom.xml`). Follow existing egg pattern (isPdfBuffer / isDocxBuffer or shared helper).
- **Register** in `frontend/src/eggs/registry.ts` and add to `AVAILABLE_EGGS`.
- **Config card** `frontend/src/components/MetadataShadowConfigCard.tsx`: key-value inputs (e.g. property name + value), allow at least one pair like "Ranking" / "Top_1%"; payload as JSON string. Add to page state and include `metadata-shadow` in payloads sent to `/api/harden`.
- **TDD:** Write `MetadataShadow.test.ts` first (metadata shape, owaspMapping LLM02, validatePayload allowlist, transform sets metadata for PDF and DOCX); then implement the egg. Use a feature branch (e.g. `feature/metadata-shadow`).

---

## Phase 3 — Polish

### 3.1 Format-preservation note and hosting

- README: "Hardening rebuilds the document from extracted text; original layout and styling are not preserved." **Recruiter:** Keeps expectations clear when receiving hardened CVs. Add one sentence: "Implementation plan: see docs/IMPLEMENTATION_PLAN.md" for **Maintainer**.
- Optional: in-app hint near DropZone or download (**Candidate**).
- Hosting: add a short “Hosting & Ops” section to the README describing runtime (Node/Serverless on Vercel), file size and rate limits, and where to find logs.

### 3.2 Egg selection toggles (optional)

- State for enabled eggs (e.g. `enabledEggIds: Set<string>` or per-egg booleans). **Candidate:** Control which eggs run. **AI/HR-tech developer:** Reproducible test matrix (e.g. only Canary Wing).
- API: optional `eggIds?: string[]` in request; server filters `AVAILABLE_EGGS` to those ids and runs only those with corresponding payloads.
- Frontend: send only enabled egg ids and their payloads.

### 3.3 API route tests (required — TDD)

- **Practice:** Write tests first (TDD), then implement or adjust the route until they pass. Use a feature branch (e.g. `feature/api-harden` or `feature/api-route-tests`).
- **Scope:** FormData with minimal PDF → POST `/api/harden` → assert 200, response has `bufferBase64`, `scannerReport.scan`, decoded buffer is valid PDF. Test 400: missing file, unsupported/invalid content (magic bytes), invalid payload JSON, payload validation failure. Assert 500 response body is generic (no stack trace). Optional: test DOCX path, duality scan result shape.
- **Location:** e.g. `frontend/app/api/harden/route.test.ts` or integration test under `frontend/__tests__` / Jest config that can run API route handlers.

---

## Implementation order

| Step | Task | File(s) | Persona focus |
|------|------|--------|----------------|
| 1.1 | POST /api/harden: FormData, **detect type from buffer magic bytes**, process(), JSON response; filter payload keys; safe 400/500; optional `detectDocumentType()` helper | `frontend/app/api/harden/route.ts`; optional `documentExtract` or `lib/fileType.ts` | Security, Maintainer |
| 1.2 | Page: upload, fetch, decode, download, dualityResult, state; clear error on new file; optional size hint | `frontend/app/page.tsx` | Candidate |
| 1.4 | Error handling (safe messages, generic 500) | route, page | Candidate, Security |
| 2.1 | InvisibleHandConfigCard + “default if empty” copy | `InvisibleHandConfigCard.tsx`, page | Candidate |
| 2.2 | **Metadata Shadow (Option A):** implement egg + registry + config card; TDD + feature branch | `MetadataShadow.ts`, `MetadataShadow.test.ts`, registry, `MetadataShadowConfigCard.tsx`, page | Recruiter, Maintainer |
| 3.1 | README: format note + link to implementation plan | README.md, optional page | Recruiter, Maintainer |
| 3.2 | Optional egg toggles + API eggIds | page, route | Candidate, AI developer |
| 3.3 | **API route tests (required):** TDD — write tests first, then implement; feature branch | route test file (e.g. `harden/route.test.ts`) | Maintainer, Security |
