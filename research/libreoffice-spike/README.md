# LibreOffice spike — DOCX → PDF for styled layout research

Reproducible **headless LibreOffice** conversion for golden fixtures in  
[`frontend/e2e/fixtures/research/`](../../frontend/e2e/fixtures/research/README.md).

## Prerequisites

- Docker
- Generated fixtures: `cd frontend && npm run gen:research-fixtures`

## Build

```bash
cd research/libreoffice-spike
docker build -t funversarial-lo-pdf-spike .
```

## Convert one file

Mount the fixtures directory read-only and an output directory:

```bash
FIX=../../frontend/e2e/fixtures/research
OUT=$(pwd)/out
mkdir -p "$OUT"

docker run --rm \
  -v "$(realpath "$FIX"):/in:ro" \
  -v "$(realpath "$OUT"):/out" \
  funversarial-lo-pdf-spike \
  /in/golden-minimal-all-eggs.docx /out
```

Expected artifact: `out/golden-minimal-all-eggs.pdf` (or `input.pdf` renamed per `convert.sh` — verify with `ls out`).

Repeat for `golden-cv-all-eggs.docx`.

## Egg signal checks (host)

From `frontend/` (uses repo `pdf-parse` + `pdf-lib`):

```bash
npm run check:research-pdf -- ../research/libreoffice-spike/out/golden-minimal-all-eggs.pdf
```

Record **PASS/FAIL** lines in the matrix in  
[`docs/STYLED_PDF_EGG_RETENTION_RESEARCH_BRIEF.md`](../../docs/STYLED_PDF_EGG_RETENTION_RESEARCH_BRIEF.md) §6.

## Notes

- LibreOffice version is **Debian bookworm** package (`libreoffice-writer`); upgrade the base image to change versions.
- This spike **does not** integrate with Vercel; production would call a similar container via a worker or HTTP sidecar.
- `convert.sh` copies the input to `/tmp` so LibreOffice sees a stable basename; output is renamed to match the original `.docx` basename when possible.

## Git

The `out/` directory is gitignored (local PDFs only).
