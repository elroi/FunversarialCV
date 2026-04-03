# API: POST /api/harden

Contract for the egg-injection endpoint (`/api/harden`). Use this to test parsers against a stable API without reading route code.

## Request

- **Method:** `POST`
- **URL:** `/api/harden`
- **Content-Type:** `multipart/form-data`

### Form fields

| Field      | Required | Description |
|-----------|----------|-------------|
| `file`    | Yes      | Single Word document (.docx). Max 4 MB. Document type is determined by magic bytes (not filename or Content-Type). Extension must match content (`.docx`). |
| `payloads`| No       | JSON string `Record<eggId, string>`. Keys are egg ids (`invisible-hand`, `incident-mailto`, `canary-wing`, `metadata-shadow`). If omitted, `{}` is used. Unknown keys are ignored. |
| `eggIds`  | No       | JSON string array of egg ids. If present and non-empty, only these eggs run. Omit or leave empty to run all eggs. |
| `divergenceProfile` | No | One of `balanced`, `machine`, `visible`. If omitted or invalid, behavior matches **`balanced`** (no server-side payload shaping; backward compatible). **`machine`** strengthens parser/LLM-visible signals (e.g. longer hidden trap text, extra metadata decoys, dual canary embeddings) while keeping human-visible changes bounded (e.g. canary link stays non-prominent). **`visible`** is demo-oriented (e.g. visible-styled canary hyperlink) on top of similar parser boosts. The web UI sends `machine` by default. |
| `preserveStyles` | No | `true` / `1` to prefer the add-only style-preserving path when all selected eggs are add-only. |
| `includePdfExport` | No | `true` / `1` to request an optional PDF export in the JSON response (DOCX pipeline only). |

#### `metadata-shadow` payload

JSON string. **Legacy:** flat object whose keys are custom property names (letters, digits, underscore only) and values are strings (max length 200, no PII per server validation), e.g. `{"Company":"Funversarial Research Lab"}`. Up to 20 custom keys.

**Extended:** optional buckets:

```json
{
  "custom": { "Ranking": "Top_1%", "Tier": "A" },
  "standard": {
    "title": "Optional",
    "subject": "Optional",
    "author": "Optional",
    "keywords": "Optional"
  }
}
```

If the top level includes a `custom` object or a `standard` object, only those two top-level keys are allowed. `custom` values follow the same rules as legacy keys. `standard` may only use `title`, `subject`, `author`, and `keywords`.

**DOCX:** `custom` is written to `docProps/custom.xml`; `standard` maps to `docProps/core.xml` (`dc:title`, `dc:subject`, `dc:creator`, `cp:keywords`).

**PDF:** Only the `custom` map is applied (as PDF Keywords, `Key: Value` tokens). `standard` is validated but **not** written to PDF in the current release.

## Success (200)

JSON body:

- `bufferBase64` (string) — Base64-encoded output document (eggs applied). Decode and use as blob for download.
- `mimeType` (string) — `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX).
- `scannerReport` — `{ scan: { hasSuspiciousPatterns, matchedPatterns, details? }, alerts: string[] }`. Pre-injection scan result (duality check).
- `originalName` (string) — Original filename from the upload.

---

## Canary analytics (GET /api/canary/[...token])

When a Canary Wing URL is followed, the `/api/canary/[...token]` route:

- Parses a `tokenId` and optional `variant` (e.g. `docx-hidden`, `pdf-clickable`).
- Logs a structured hit and records it in an in-memory, process-local buffer for **short-lived analytics**.

Stored fields for each hit:

- `tokenId` (string)
- `variant` (string, e.g. `pdf-text`, `docx-hidden`, or `legacy`)
- `ts` (ISO timestamp string)
- `userAgent` (optional, truncated)
- `referer` (optional, truncated)

No CV content, CV metadata, IP address, or other PII is written by this endpoint; the canary token is the only identifier.

**v1:** Hits are not persisted to durable storage; data is process-local and may be lost on cold starts or scaling. To add durable analytics later, wire Vercel KV (or similar) in `persistCanaryHit` in `frontend/src/lib/canaryHits.ts`; that function is the designated extension point.

---

## Canary status (GET /api/canary/status)

Candidate-facing "did my canary sing?" — returns recent hits for a single token so the user can see when their canary was triggered.

- **Query:** `token` (required) — the canary token (same as in the embedded URL). Only hits for this token are returned; the token acts as the secret.
- **Response (200):** `{ hits: Array<{ variant, ts, userAgent?, referer? }> }` (newest first, up to 50).
- **Rate limit:** Per-IP; configurable via `RATE_LIMIT_CANARY_STATUS_MAX` / `RATE_LIMIT_CANARY_STATUS_WINDOW_MS`. 429 with `Retry-After` when exceeded.
- **Best-effort:** Data is process-local (in-memory). After a cold start or with multiple instances, the list may be empty until the next canary hit lands on the same process.

| Status | When | Example message |
|--------|------|-----------------|
| 400    | Missing or empty `token` | "Missing query parameter: token." |
| 429    | Too many status checks from this IP | "Too many status checks. Try again later." |

---

## Errors

All error responses have a JSON body `{ error: string }`.

| Status | When | Example message |
|--------|------|-----------------|
| 400    | Missing or invalid file | "Missing or invalid file. Upload a single Word document (.docx)." |
| 400    | Invalid payloads JSON   | "Invalid payloads JSON." |
| 400    | Content is PDF (DOCX only) | "We currently support Word documents (.docx) only. PDF support is planned for a future release." |
| 400    | Content not valid DOCX (magic bytes) | "Unsupported or invalid document: file must be a valid Word document (.docx)." |
| 400    | File content does not match extension | "File content does not match extension." |
| 413    | File too large          | "File too large. Max size is 4 MB." |
| 500    | Unexpected server error | "Processing failed. Please try again." |

No stack traces or internal paths are returned to the client.
