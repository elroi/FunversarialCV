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
              Resources
            </h2>
            <p className="text-noir-foreground/80">
              Context, patterns, and safety notes for Funversarial CVs – an
              educational tool designed for candidates, hiring teams, and
              security practitioners exploring OWASP-aligned adversarial
              document hardening.
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
              For candidates
            </h2>
            <p className="text-noir-foreground/80 mb-2">
              Use a Funversarial CV when you are explicitly experimenting with
              AI-heavy or agentic hiring flows – for example, when roles or
              organizations publicly discuss LLM-based screening. Avoid using
              hardened CVs for conservative, compliance-heavy, or regulated
              roles where any non-standard formatting could be misinterpreted.
            </p>
            <p className="text-noir-foreground/80">
              Keep a clean, conventional CV for traditional channels, and treat
              Funversarial CVs as an opt-in, experimental track for AI-aware
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
              understand how fragile those systems are in the face of subtle
              prompt injection, hallucination bait, or metadata manipulation,
              without intending to trick human reviewers.
            </p>
            <p className="text-noir-foreground/80">
              We recommend evaluating Funversarial CVs in sandboxes or test
              tenants first. Use them to validate that screening agents do not
              over-trust document content, and that human-in-the-loop controls
              remain in place when high-stakes decisions are involved.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-neon-green mb-2">
              Security, privacy, and the Stateless Vault
            </h2>
            <p className="text-noir-foreground/80 mb-2">
              FunversarialCV follows a Stateless Vault model: documents are
              processed in-memory only and are never persisted to disk or long
              term storage. Before any hardening, the engine performs{" "}
              <strong>PII dehydration</strong> – replacing sensitive elements
              like email addresses, phone numbers, or postal addresses with
              short-lived tokens.
            </p>
            <p className="text-noir-foreground/80 mb-2">
              All eggs and adversarial patterns operate only on this dehydrated
              document. Once the transformations are complete, PII is{" "}
              <strong>rehydrated</strong> into the outgoing stream, which is
              then returned to the browser as a base64-encoded buffer. The
              hardened document is never stored server-side; the system is
              designed for <strong>zero-retention</strong> after response
              completion.
            </p>
            <p className="text-noir-foreground/80">
              Low-level parsers such as pdf-lib and docx are used strictly as
              data manipulators – no macros, scripts, or embedded code are
              executed during processing.
            </p>
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
            <p className="text-noir-foreground/80">
              The goal is defensive: to make it easier for practitioners to
              reason about, test, and harden AI-assisted hiring stacks – not to
              weaponize CVs in production environments or bypass human judgment.
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}

