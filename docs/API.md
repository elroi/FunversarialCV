# API: POST /api/harden

Contract for the hardening endpoint. Use this to test parsers against a stable API without reading route code.

## Request

- **Method:** `POST`
- **URL:** `/api/harden`
- **Content-Type:** `multipart/form-data`

### Form fields

| Field      | Required | Description |
|-----------|----------|-------------|
| `file`    | Yes      | Single PDF or DOCX file. Max 10 MB. Document type is determined by magic bytes (not filename or Content-Type). Extension must match content (e.g. PDF content must have `.pdf` extension). |
| `payloads`| No       | JSON string `Record<eggId, string>`. Keys are egg ids (`invisible-hand`, `incident-mailto`, `canary-wing`, `metadata-shadow`). If omitted, `{}` is used. Unknown keys are ignored. |
| `eggIds`  | No       | JSON string array of egg ids. If present and non-empty, only these eggs run. Omit or leave empty to run all eggs. |

## Success (200)

JSON body:

- `bufferBase64` (string) — Base64-encoded hardened document. Decode and use as blob for download.
- `mimeType` (string) — `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- `scannerReport` — `{ scan: { hasSuspiciousPatterns, matchedPatterns, details? }, alerts: string[] }`. Pre-hardening scan result (duality check).
- `originalName` (string) — Original filename from the upload.

## Errors

All error responses have a JSON body `{ error: string }`.

| Status | When | Example message |
|--------|------|-----------------|
| 400    | Missing or invalid file | "Missing or invalid file. Upload a single PDF or DOCX." |
| 400    | Invalid payloads JSON   | "Invalid payloads JSON." |
| 400    | Content not PDF or DOCX (magic bytes) | "Unsupported or invalid document: file must be a valid PDF or DOCX." |
| 400    | File content does not match extension | "File content does not match extension." |
| 413    | File too large          | "File too large. Max size is 10 MB." |
| 500    | Unexpected server error | "Processing failed. Please try again." |

No stack traces or internal paths are returned to the client.
