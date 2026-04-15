# 🐙 FunversarialCV
**The Security Architect's Approach to Professional Differentiation.**

FunversarialCV is an open-source tool designed for the "duality of AI security". It lets candidates **inject** technical easter eggs, metadata "watermarks," and adversarial layers into their CVs—bridging human creativity and machine parsing for controlled testing.

Built by a Senior Security Architect specialized in AI Governance, this tool serves as a "Red Teaming" exercise for the HR-tech industry.

**Brand and voice (Funversarial family):** [docs/BRAND_COMMUNICATION_STRATEGY.md](docs/BRAND_COMMUNICATION_STRATEGY.md) — narrative guide; [docs/brand-guide.json](docs/brand-guide.json) — structured fields for plans and tooling.

---

## 📖 Using FunversarialCV

The service uses a **three-step flow** so you can configure eggs before running the pipeline:

1. **Upload your CV** — Drop or select a Word document (.docx). The file is "armed" (held in memory in your browser only); no processing runs yet. **Input is DOCX-only** (type is detected from file content / magic bytes, not the filename).
2. **Configure eggs** — Use the config cards to set options for each egg (e.g. Mailto Surprise / Incident Mailto template, Canary Wing URL or token). You can change these as needed. The web UI applies a **`divergenceProfile`** when calling the API (default **`machine`**—stronger parser-visible signals with human-visible changes bounded); see [docs/API.md](docs/API.md) for `balanced`, `machine`, and `visible`.
3. **Inject Eggs (security mode)** / **Add signals (HR mode)** — When ready, use the primary action to run the pipeline. The dehydrated document is sent to the server, processed in memory (stateless), and your CV with injected eggs downloads automatically. Optionally request **Also export PDF** for a server-built PDF (plain layout; parser-oriented signals preserved—details in [docs/API.md](docs/API.md)). The pipeline UI shows the pre-injection scan result (e.g. existing prompt-injection or canary patterns in your original file)—**Duality Monitor** in security mode, **Processing steps** in HR mode.

You can upload a different file at any time to replace the armed CV and configure again before running the pipeline.

**Validation Lab (home page):** The app includes a **stateless Validation Lab**—extract modes and optional LLM completion over **tokenized** text—backed by `/api/lab/*`. Completion and model choice are **environment-gated** (operator configuration). Protocol and copy constraints: [CONTRIBUTING.md](CONTRIBUTING.md); contract: [docs/API.md](docs/API.md).

**Upload size note:** To stay safely under Vercel’s Serverless Function request limits and avoid opaque platform 413 errors, FunversarialCV currently supports CVs up to **4 MB** per upload.

**Note:** Egg injection rebuilds the document from extracted text by default; original DOCX layout and styling are not preserved in the output unless you enable **Preserve styles** for compatible eggs (Invisible Hand, Canary Wing, Metadata Shadow, and Incident Mailto).

---

## 🛠 Features (The "Egg Library")
Every feature in FunversarialCV is an "Egg" mapped to the **OWASP Top 10 for LLM Applications**, allowing for extensible, community-driven "attacks" on automated recruitment systems.

* **The Invisible Hand (LLM01: Prompt Injection):** Injects white-font "system instructions" (0.5pt) to influence LLM-based ranking systems.
* **The Metadata Shadow (LLM02: Insecure Output):** Embeds custom key-value pairs in file properties (e.g., `Ranking: Top_1%`), with optional **standard** core properties (`title`, `subject`, `author`, `keywords`) on DOCX per [docs/API.md](docs/API.md). For optional PDF export, custom properties map to PDF Keywords; standard fields are not written to PDF in the current release.
* **Incident Mailto / Mailto Surprise (LLM02: Insecure Output):** Wraps your email address in a pre-filled `mailto:` link formatted as a system log entry—useful for testing **link trust** and social-engineering-style behavior (clicks/opens from a CV), not only abstract "LLM output" abuse. For DOCX, when **Preserve styles** is enabled, it attempts a style-preserving insertion by adding a small mailto hyperlink paragraph without altering your existing layout; in complex documents it may fall back to a simplified, rebuilt layout.
* **The Canary Wing (LLM10: Model Theft):** Embeds trackable tokens to notify you when your CV is processed in specific environments.

---

## 🔒 Security & Privacy (The Duality Pillar)
As a tool focused on **Security for AI and AI for Security**, we prioritize data integrity:

* **Zero-Retention Architecture:** Files are processed entirely in volatile memory (RAM) and are never written to disk or a database.
* **PII dehydration (Stateless Vault):** Before upload, the browser **tokenizes** common PII patterns (email, phone, common address shapes) so the server receives a **dehydrated** document. The server does not see raw PII in that path. After processing, the **Word (.docx) download is rehydrated** in the browser so contact details read normally. **Optional PDF export** is built on the server from the injected content: if you use both Word and PDF, placeholders may still appear in the PDF while the `.docx` shows real contact details—see in-app copy and [docs/API.md](docs/API.md). Detection is heuristic and focused on obvious high-risk patterns (e.g. `user@example.com`, `+1 (555) 123-4567`, `123 Main St …`), not full DLP.
* **v1 formats:** **Upload:** Word documents (`.docx`) only for the main hardening pipeline. **Download:** `.docx` plus optional server-generated **PDF** (plain layout) when you opt in. Document type for upload is detected from file content (magic bytes), not filename.
* **Stateless Execution:** Your data exists only for the duration of the request. Once the download is complete, the memory is purged.

For **Canary Wing** specifically, **GET** requests to **`/api/canary/<token>`** (optionally with a **variant** segment or `?v=` query, e.g. `docx-hidden`) record **ephemeral, token-scoped hits** for analytics:

- Stored fields: `tokenId`, `variant`, `ts`, and truncated `userAgent` / `referer` strings.
- No CV content or PII ever reaches this endpoint; the canary token is the only identifier.
- In the default setup, hits are kept in a small, in-memory ring buffer (process-local, capped at recent activity) and are intended for **debugging and red-teaming**, not long-term tracking.
- **Did my canary sing?** In the app, use **Check for triggers** in the Canary Wing card to see recent hits for your token. The status is **best-effort and process-local**: you see triggers only when the same server process handled both the canary ping and your status check; after a cold start or with multiple instances you may see none until the next hit.
- **v1 scope:** v1 does not provide long-term canary analytics; canary hits are **signal-only** (process-local). To add durable analytics, wire a **durable store** (e.g. Redis or Postgres under your control) in `persistCanaryHit` in [frontend/src/lib/canaryHits.ts](frontend/src/lib/canaryHits.ts); that function is the designated extension point.

---

## 🚀 For Recruiters & Developers
* **For Recruiters:** Find the hidden layers? You've found a candidate with deep technical integration skills.
* **For AI Developers:** Use this tool to "unit test" your parsers against prompt injection and metadata manipulation. Learn what it takes to build resilient HR-tech. API contract: [docs/API.md](docs/API.md).

---

## 🛰 Hosting & Ops (Vercel)

FunversarialCV is designed to run as a Next.js 14 app on Vercel:

- **Runtime:** Node.js serverless functions for `/api/harden` (egg injection), `/api/canary/*` (canary hits), `/api/canary/status`, and `/api/lab/*` (Validation Lab), with stateless, in-memory processing for uploads (no durable file storage).
- **File size:** CV uploads are limited to **4 MB** per file to stay safely under Vercel’s Serverless request caps and avoid opaque platform 413 errors.
- **Rate limiting:** `/api/harden`, `/api/canary/*`, and `/api/canary/status` use lightweight, per-IP rate limiting with configurable env vars (`RATE_LIMIT_HARDEN_*`, `RATE_LIMIT_CANARY_*`, `RATE_LIMIT_CANARY_STATUS_*`). The Validation Lab uses `RATE_LIMIT_LAB_EXTRACT_*` and `RATE_LIMIT_LAB_COMPLETE_*`—see [docs/API.md](docs/API.md).
- **Logging:** Structured JSON logs (route, event, meta) are emitted via `log.ts` and visible in Vercel logs; no PII or CV content is logged, only tokens/variants and operational metadata.
- **Error behavior:** User-facing errors are explicit but safe (no stack traces or internal paths); 500 responses are generic ("Processing failed. Please try again.") while details are logged server-side only.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the list of deployment environment variables and CI/branch protection expectations.

---

## 🧩 Extensibility
The Egg Library is a **Plugin System**. Want to add a new "attack" or a creative "Technical Implementation"? Add a new plugin under **`frontend/src/eggs/`** using the standard **`IEgg`** interface and register it in **`frontend/src/eggs/registry.ts`**.

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and workflow. Implementation plan: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

---

## 🎓 About the Creator
**Elroi Luria** is a Senior Security Architect and Innovation Team Leader focused on **AI Governance** and **Emerging Technologies**. With a background spanning **Cyber Security Innovation at Citi**, **Incident Response at PayPal**, and **Music**, Elroi builds tools that harmonize technical rigor with creative disruption.

---
