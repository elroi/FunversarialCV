#!/bin/sh
set -e
# Usage: convert-docx-to-pdf.sh <input.docx> <output-dir>
# Writes <basename>.pdf into output-dir using LibreOffice headless mode.
if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <input.docx> <output-directory>" >&2
  exit 1
fi
IN="$1"
OUTDIR="$2"
mkdir -p "$OUTDIR"
cp "$IN" /tmp/input.docx
libreoffice --headless --nologo --nofirststartwizard \
  --convert-to pdf --outdir "$OUTDIR" /tmp/input.docx
# LibreOffice names output from original basename; we copied as input.docx
if [ -f "$OUTDIR/input.pdf" ]; then
  BASENAME=$(basename "$IN" .docx)
  if [ "$BASENAME" != "input" ]; then
    mv "$OUTDIR/input.pdf" "$OUTDIR/${BASENAME}.pdf"
  fi
fi
echo "Done. Listing $OUTDIR:" >&2
ls -la "$OUTDIR" >&2
