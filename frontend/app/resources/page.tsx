import React from "react";
import Link from "next/link";

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-noir-bg text-noir-foreground">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-8 md:py-10">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-noir-border pb-4">
          <div>
            <h1 className="text-2xl font-semibold">
              <span className="bg-gradient-to-r from-neon-green via-neon-cyan to-neon-green bg-clip-text text-transparent">
                FunversarialCV
              </span>
            </h1>
            <p className="text-xs text-noir-foreground/70">
              Adversarial CV hardening console for hungry LLMs.
            </p>
          </div>
        </header>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-neon-cyan/80">
            PII Mode: Stateless &amp; Volatile
          </p>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full border border-neon-green/60 bg-noir-panel px-3 py-1 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-neon-green engine-online-pulse">
              Engine Online
            </span>
            <Link
              href="/"
              className="rounded-full border border-neon-cyan/70 px-3 py-1 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-neon-cyan hover:border-neon-green hover:text-neon-green focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/60"
            >
              Back home
            </Link>
          </div>
        </div>

        <section className="space-y-8 text-sm text-noir-foreground/90">
          <section>
            <h2 className="text-base font-semibold text-neon-green mb-2">
              Usage and responsibility
            </h2>
            <p className="text-noir-foreground/80 mb-2">
              FunversarialCV is provided for educational and research purposes
              only. It is intended to help practitioners explore and harden
              AI-assisted hiring workflows against adversarial behaviour in a
              controlled, permissioned setting.
            </p>
            <p className="text-noir-foreground/80 mb-2">
              No guarantee is made that this tool will detect, prevent, or
              simulate every attack pattern, and it does not constitute legal,
              compliance, or HR advice. You are solely responsible for how you
              use this tool and any documents produced with it, including
              compliance with all applicable laws, regulations, and
              organizational policies.
            </p>
            <p className="text-noir-foreground/80">
              Do not weaponize FunversarialCV: do not use it to evade legitimate
              security controls, deceive human reviewers, or cause harm. Use it
              only where you have explicit authorization to perform adversarial
              testing.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-neon-green mb-2">
              Why Funversarial CVs?
            </h2>
            <p className="text-noir-foreground/80">
              FunversarialCV exists as an educational tool to deliberately
              harden CVs against AI-driven screening systems. It layers
              OWASP-aligned adversarial patterns into documents so security
              teams, hiring organizations, and candidates can explore how large
              language models behave under prompt injection, invisible
              instructions, and noisy metadata – without sacrificing human
              readability.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neon-green mb-2">
              Preserve styles and document structure (AST)
            </h2>
            <p className="text-noir-foreground/80 mb-2">
              When you enable <strong>Preserve styles</strong>, we try to keep
              your original layout and formatting by editing the document at the
              structure level instead of rebuilding it from plain text. That
              structure is often called an <strong>AST</strong> (abstract syntax
              tree): a tree representation of the document (e.g. for DOCX, the
              XML in <code className="font-mono text-[10px] bg-noir-panel px-1 rounded">word/document.xml</code>).
              We modify specific nodes (e.g. wrapping the email run in a
              hyperlink) so styles and layout stay intact. When AST-level edits
              aren’t possible – for example with some PDFs or when an egg
              changes body text – we fall back to a rebuild path; the UI and log
              indicate which path was used.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neon-green mb-2">
              What are eggs?
            </h2>
            <p className="text-noir-foreground/80 mb-2">
              Eggs are small, composable adversarial patterns that can be
              layered into a CV. Each egg targets specific LLM behaviours – for
              example, prompt injection, hallucination, or over-trust in
              metadata – while keeping the document readable to humans.
            </p>
            <p className="text-noir-foreground/80">
              The concept is inspired by classic easter eggs in games and
              software: hidden elements that are meant to be searched for,
              surfaced, and understood. Funversarial eggs are designed for
              educational red-teaming of AI-assisted hiring stacks, not for
              bypassing human review or ATS rules in production.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neon-green mb-2">
              For candidates
            </h2>
            <p className="text-noir-foreground/80 mb-2">
              Act responsibly! This is an educational tool. Only use a
              Funversarial CV on systems having AI-heavy or agentic hiring flows
              you own or for which you have explicit written permission to do
              so.
            </p>
            <p className="text-noir-foreground/80 mb-2">
              For example, when roles or organizations publicly discuss LLM-based
              screening and are open to research-oriented or red-teaming style
              exercises. Even when doing so, you should exercise caution and
              avoid using hardened CVs for conservative, compliance-heavy, or
              regulated roles where any non-standard formatting could be
              misinterpreted.
            </p>
            <p className="text-noir-foreground/80">
              Keep a clean, conventional CV for traditional channels, and treat
              Funversarial CVs as an opt-in, educational track for AI-aware
              organizations that understand adversarial testing and OWASP LLM
              risks.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neon-green mb-2">
              For hiring teams
            </h2>
            <p className="text-noir-foreground/80 mb-2">
              Many modern pipelines quietly rely on LLMs to summarize,
              shortlist, or rank candidates. Funversarial CVs help you
              understand, in an educational and controlled way, how fragile
              those systems can be in the face of subtle prompt injection,
              hallucination bait, or metadata manipulation, without intending to
              trick human reviewers.
            </p>
            <p className="text-noir-foreground/80">
              We recommend evaluating Funversarial CVs as an educational signal
              in sandboxes or test tenants first. Use them to validate that
              screening agents do not over-trust document content, and that
              human-in-the-loop controls remain in place when high-stakes
              decisions are involved.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neon-green mb-2">
              Security, privacy, and the Stateless Vault
            </h2>
            <p className="text-noir-foreground/80 mb-2">
              FunversarialCV follows a Stateless Vault model: documents are
              processed in-memory only and are never persisted to disk or long
              term storage. <strong>Dehydration and rehydration occur in your
              browser.</strong> Before any data leaves your device, the client
              performs <strong>PII dehydration</strong> – replacing sensitive
              elements like email addresses, phone numbers, or postal addresses
              with short-lived tokens. Only the tokenized text (and metadata like
              original MIME type) is sent to the server; the server never sees
              your raw contact details.
            </p>
            <p className="text-noir-foreground/80 mb-2">
              All eggs and adversarial patterns operate only on this dehydrated
              document on the server. The server returns a tokenized buffer; the
              browser <strong>rehydrates</strong> PII back into the final
              document and streams it to you as a download. The hardened document
              is never stored server-side; the system is designed for{" "}
              <strong>zero-retention</strong> after response completion.
            </p>
            <p className="text-noir-foreground/80 mb-2">
              Low-level parsers such as pdf-lib and docx are used strictly as
              data manipulators – no macros, scripts, or embedded code are
              executed during processing.
            </p>
            <p className="text-noir-foreground/80 mb-2">
              <strong>For security reviewers:</strong> To verify that only tokens
              leave the browser, open DevTools → Network, trigger &quot;Harden
              CV&quot;, and inspect the <code className="font-mono text-[10px] bg-noir-panel px-1 rounded">POST /api/harden</code> request.
              The payload should contain placeholders like{" "}
              <code className="font-mono text-[10px] bg-noir-panel px-1 rounded">{`{{PII_EMAIL_0}}`}</code> and must
              not contain raw email, phone, or address strings. E2E tests in{" "}
              <code className="font-mono text-[10px] bg-noir-panel px-1 rounded">frontend/e2e/specs/happy-path.spec.ts</code> assert
              this; key client logic lives in <code className="font-mono text-[10px] bg-noir-panel px-1 rounded">frontend/src/lib/clientVault.ts</code> and{" "}
              <code className="font-mono text-[10px] bg-noir-panel px-1 rounded">frontend/app/api/harden/route.ts</code> for the server.
            </p>
            <div className="mt-3 grid gap-4 text-noir-foreground/80 md:grid-cols-2">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan">
                  Processing flow (Stateless Vault)
                </h3>
                <ul className="space-y-1 text-xs sm:text-sm font-mono">
                  <li>
                    &gt; [1] Load — CV is uploaded from the browser and held in
                    memory only.
                  </li>
                  <li>
                    &gt; [2] Dehydrate PII — emails, phone numbers, and similar
                    identifiers are replaced with short-lived vault tokens.
                  </li>
                  <li>
                    &gt; [3] Analyze duality — the original CV is scanned for
                    existing prompt-injection or other adversarial patterns.
                  </li>
                  <li>
                    &gt; [4] Apply eggs — selected adversarial eggs are layered
                    onto the dehydrated document only (no macros or scripts
                    executed).
                  </li>
                  <li>
                    &gt; [5] Rehydrate PII — tokens are replaced with the original
                    PII in the outgoing buffer.
                  </li>
                  <li>
                    &gt; [6] Stream &amp; purge — the hardened CV is streamed back
                    as a base64 buffer and in-memory data is discarded, with
                    nothing persisted server-side.
                  </li>
                </ul>
              </div>
              <section
                aria-label="Stateless Vault data flow diagram"
                className="rounded-lg border border-noir-border bg-noir-panel/60 p-3"
              >
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-neon-cyan">
                  System diagram
                </h3>
                <pre className="font-mono text-[10px] sm:text-xs whitespace-pre leading-relaxed text-noir-foreground/80">
{`+------------------------------------------------------------+
|                      Browser client                        |
|                                                            |
|  [1] Load (in-memory only; CV uploaded from browser)       |
|  [2] Dehydrate PII (Vault: raw PII -> short-lived tokens)  |
|                                                            |
|    +----------------------------------------------------+  |
|    |         Transformation Engine (tokens only)        |  |
|    |                                                    |  |
|    |  [3] Analyze duality (scan tokenized CV            |  |
|    |      for existing adversarial patterns)            |  |
|    |  [4] Apply eggs (Funversarial layers added         |  |
|    |      on tokens, no raw PII)                        |  |
|    +----------------------------------------------------+  |
|                                                            |
|  [5] Rehydrate PII (tokens -> original PII in buffer)      |
|  [6] Stream & purge (send hardened CV back to browser;     |
|      server memory cleared, nothing persisted)             |
+------------------------------------------------------------+`}
                </pre>
              </section>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neon-green mb-2">
              OWASP LLM alignment and eggs
            </h2>
            <p className="text-noir-foreground/80 mb-2">
              Each egg in FunversarialCV is designed with reference to the
              OWASP Top 10 for LLM Applications. For example, invisible prompt
              injections and &quot;LLM-trap&quot; style instructions are tied to
              risks around prompt injection and insecure output handling, while
              hallucination-oriented patterns are used to surface over-reliance
              on model-generated summaries.
            </p>
            <p className="text-noir-foreground/80 mb-2">
              The goal is defensive: to make it easier for practitioners to
              reason about, test, and harden AI-assisted hiring stacks – not to
              weaponize CVs in production environments or bypass human judgment.
            </p>
            <p className="text-noir-foreground/80">
              For the full OWASP Top 10 for LLM Applications, see the{" "}
              <Link
                href="https://owasp.org/www-project-top-10-for-large-language-model-applications/"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted underline-offset-2 text-neon-cyan hover:text-neon-green"
              >
                OWASP Top 10 for LLM Applications
              </Link>
              . For a high-level overview in video form, watch the{" "}
              <Link
                href="https://www.youtube.com/watch?v=gUNXZMcd2jU"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted underline-offset-2 text-neon-cyan hover:text-neon-green"
              >
                Recommended talk: OWASP&apos;s Top 10 Ways to Attack LLMs
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neon-green mb-2">
              Get started
            </h2>
            <p className="text-noir-foreground/80 mb-2">
              Want to try this out but afraid to upload your own file? Use the
              built-in demo CVs from the main FunversarialCV console first to
              see how different eggs behave without touching any real data.
            </p>
            <p className="text-noir-foreground/80 mb-2">
              If you are a candidate, keep your conventional CV as the primary
              version and only use Funversarial CVs in AI-heavy pipelines where
              you have explicit permission to experiment. Start with a single
              egg enabled and incrementally layer on more complexity.
            </p>
            <p className="text-noir-foreground/80">
              If you are part of a hiring or security team, wire Funversarial
              CVs into a sandbox or test tenant of your hiring stack. Compare
              how clean and Funversarial CVs move through your pipeline, and use
              the differences to tighten prompts, add guardrails, and reinforce
              human-in-the-loop review.
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}

