# Research fixtures — styled PDF / egg retention

Binary files in this directory are **generated**; do not hand-edit.

## Files

| File | Description |
|------|-------------|
| `golden-minimal-all-eggs.docx` | Minimal paragraph + all registry eggs applied (`process`, `preserveStyles`) |
| `golden-cv-all-eggs.docx` | CV-shaped DOCX (bold title, sections, synthetic email) + all eggs |

Payloads use **synthetic** data only (`example.com` canary base, `research.candidate@example.com`, fixed trap phrase).

## Regenerate

From the `frontend/` directory:

```bash
npm run gen:research-fixtures
```

Requires dev dependencies (including `tsx`). See [`scripts/gen-research-docx-fixtures.ts`](../../../scripts/gen-research-docx-fixtures.ts).

## Use

- LibreOffice / converter spikes: convert these to PDF and run the egg matrix in [`docs/STYLED_PDF_EGG_RETENTION_RESEARCH_BRIEF.md`](../../../../docs/STYLED_PDF_EGG_RETENTION_RESEARCH_BRIEF.md).
