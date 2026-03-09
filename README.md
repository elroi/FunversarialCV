# 🐙 FunversarialCV
**The Security Architect's Approach to Professional Differentiation.**

FunversarialCV is an open-source tool designed for the "duality of AI security". It allows candidates to "harden" their CVs by injecting technical easter eggs, metadata "watermarks," and adversarial layers that bridge the gap between human creativity and machine parsing.

Built by a Senior Security Architect specialized in AI Governance, this tool serves as a "Red Teaming" exercise for the HR-tech industry.

---

## 📖 Using FunversarialCV

The service uses a **two-step flow** so you can configure eggs before hardening:

1. **Upload your CV** — Drop or select a PDF or DOCX file. The file is "armed" (held in memory in your browser only); no processing runs yet.
2. **Configure eggs** — Use the config cards to set options for each egg (e.g. Incident Mailto template, Canary Wing URL or token). You can change these as needed.
3. **Click Harden** — When ready, click **Harden** to run the pipeline. The file is sent to the server, processed in memory (stateless), and your hardened CV downloads automatically. The Duality Monitor shows the pre-hardening scan result (e.g. existing prompt-injection or canary patterns in your original file).

You can upload a different file at any time to replace the armed CV and configure again before hardening.

**Upload size note:** To stay safely under Vercel’s Serverless Function request limits and avoid opaque platform 413 errors, FunversarialCV currently supports CVs up to **4 MB** per upload.

**Note:** Hardening rebuilds the document from extracted text; original PDF or DOCX layout and styling are not preserved in the output.

---

## 🛠 Features (The "Egg Library")
Every feature in FunversarialCV is an "Egg" mapped to the **OWASP Top 10 for LLM Applications**, allowing for extensible, community-driven "attacks" on automated recruitment systems.

* **The Invisible Hand (LLM01: Prompt Injection):** Injects white-font "system instructions" (0.5pt) to influence LLM-based ranking systems.
* **The Metadata Shadow (LLM02: Insecure Output):** Embeds custom key-value pairs in file properties (e.g., `Ranking: Top_1%`).
* **The Logic Bomb (Creative):** Wraps your email address in a pre-filled `mailto:` link formatted as a system log entry.
* **The Canary Wing (LLM10: Model Theft):** Embeds trackable tokens to notify you when your CV is processed in specific environments.

---

## 🔒 Security & Privacy (The Duality Pillar)
As a tool focused on **Security for AI and AI for Security**, we prioritize data integrity:

* **Zero-Retention Architecture:** Files are processed entirely in volatile memory (RAM) and are never written to disk or a database.
* **PII Sanitization:** Before "hardening," the tool identifies PII patterns (Email, Phone, and common Address formats) to help you redact sensitive data before sharing your CV globally. Detection is heuristic and focused on obvious high-risk patterns (e.g. `user@example.com`, `+1 (555) 123-4567`, `123 Main St …`), not full DLP.
* **Stateless Execution:** Your data exists only for the duration of the request. Once the download is complete, the memory is purged.

For **Canary Wing** specifically, the `/api/canary` endpoint records **ephemeral, token-scoped hits** for analytics:

- Stored fields: `tokenId`, `variant`, `ts`, and truncated `userAgent` / `referer` strings.
- No CV content or PII ever reaches this endpoint; the canary token is the only identifier.
- In the default setup, hits are kept in a small, in-memory ring buffer (process-local, capped at recent activity) and are intended for **debugging and red-teaming**, not long-term tracking.

---

## 🚀 For Recruiters & Developers
* **For Recruiters:** Find the hidden layers? You’ve found a candidate with deep technical integration skills.
* **For AI Developers:** Use this tool to "unit test" your parsers against prompt injection and metadata manipulation. Learn what it takes to build resilient HR-tech. API contract: [docs/API.md](docs/API.md).

---

## 🧩 Extensibility
The Egg Library is a **Plugin System**. Want to add a new "attack" or a creative "Technical Implementation"? Simply add a new plugin to the `/src/eggs/` folder using our standard `IEgg` interface.

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and workflow. Implementation plan: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

---

## 🎓 About the Creator
**Elroi Luria** is a Senior Security Architect and Innovation Team Leader focused on **AI Governance** and **Emerging Technologies**. With a background spanning **Cyber Security Innovation at Citi**, **Incident Response at PayPal**, and **Music**, Elroi builds tools that harmonize technical rigor with creative disruption.

---
