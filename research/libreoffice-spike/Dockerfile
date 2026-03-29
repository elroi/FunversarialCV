# Minimal image for headless DOCX → PDF (research spike).
# Not optimized for production hardening; use as a reproducible lab environment.
FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-java-common \
    ca-certificates \
    fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /work

COPY convert.sh /usr/local/bin/convert-docx-to-pdf.sh
RUN chmod +x /usr/local/bin/convert-docx-to-pdf.sh

ENTRYPOINT ["/usr/local/bin/convert-docx-to-pdf.sh"]
