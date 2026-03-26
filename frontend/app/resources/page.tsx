"use client";

import React from "react";
import Link from "next/link";
import { useCopy } from "../../src/copy";
import { SiteHeader, SiteTopBar } from "../../src/components/SiteChrome";

export default function ResourcesPage() {
  const copy = useCopy();

  return (
    <main className="min-h-dvh-screen bg-bg text-foreground">
      <div className="mx-auto flex min-h-dvh-screen min-w-0 max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-8 md:py-10">
        <SiteHeader secondaryNav={{ href: "/", label: copy.backHome }} />
        <SiteTopBar />

        <section className="space-y-8 text-sm text-foreground/90">
          <section>
            <h2 className="text-base font-semibold text-success mb-2">
              {copy.resourcesUsageTitle}
            </h2>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesUsageBody1}
            </p>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesUsageBody2}
            </p>
            <p className="text-foreground/80">
              {copy.resourcesUsageBody3}
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-success mb-2">
              {copy.resourcesWhyTitle}
            </h2>
            <p className="text-foreground/80">
              {copy.resourcesWhyBody}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-success mb-2">
              {copy.resourcesPreserveStylesTitle}
            </h2>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesPreserveStylesBody}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-success mb-2">
              {copy.resourcesWhatAreEggsTitle}
            </h2>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesWhatAreEggsBody1}
            </p>
            <p className="text-foreground/80">
              {copy.resourcesWhatAreEggsBody2}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-success mb-2">
              {copy.resourcesForCandidatesTitle}
            </h2>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesForCandidatesBody1}
            </p>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesForCandidatesBody2}
            </p>
            <p className="text-foreground/80">
              {copy.resourcesForCandidatesBody3}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-success mb-2">
              {copy.resourcesForHiringTeamsTitle}
            </h2>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesForHiringTeamsBody1}
            </p>
            <p className="text-foreground/80">
              {copy.resourcesForHiringTeamsBody2}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-success mb-2">
              {copy.resourcesSecurityTitle}
            </h2>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesSecurityBody1}
            </p>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesSecurityBody2}
            </p>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesSecurityBody3}
            </p>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesSecurityBody4}
            </p>
            <div className="mt-3 grid gap-4 text-foreground/80 md:grid-cols-2">
              <div className="space-y-1">
                <h3 className="text-caption font-semibold uppercase tracking-[0.2em] text-accent">
                  {copy.resourcesSecurityFlowTitle}
                </h3>
                <ul className="space-y-1 text-caption sm:text-sm font-mono">
                  <li>{copy.resourcesFlowStep1}</li>
                  <li>{copy.resourcesFlowStep2}</li>
                  <li>{copy.resourcesFlowStep3}</li>
                  <li>{copy.resourcesFlowStep4}</li>
                  <li>{copy.resourcesFlowStep5}</li>
                  <li>{copy.resourcesFlowStep6}</li>
                </ul>
              </div>
              <section
                aria-label="Stateless Vault data flow diagram"
                className="min-w-0"
              >
                <pre className="font-mono text-caption sm:text-xs whitespace-pre leading-relaxed text-foreground/80">
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
|  [6] Stream & purge (send CV with injected eggs back to    |
|      server memory cleared, nothing persisted)             |
+------------------------------------------------------------+`}
                </pre>
              </section>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-success mb-2">
              {copy.resourcesOwaspTitle}
            </h2>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesOwaspBody1}
            </p>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesOwaspBody2}
            </p>
            <p className="text-foreground/80">
              {copy.resourcesOwaspBody3}{" "}
              <Link
                href="https://owasp.org/www-project-top-10-for-large-language-model-applications/"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted underline-offset-2 text-accent hover:text-success"
              >
                {copy.resourcesOwaspLinkText}
              </Link>
              . {" "}
              <Link
                href="https://www.youtube.com/watch?v=gUNXZMcd2jU"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted underline-offset-2 text-accent hover:text-success"
              >
                {copy.resourcesOwaspTalkText}
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-success mb-2">
              {copy.resourcesGetStartedTitle}
            </h2>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesGetStartedBody1}
            </p>
            <p className="text-foreground/80 mb-2">
              {copy.resourcesGetStartedBody2}
            </p>
            <p className="text-foreground/80">
              {copy.resourcesGetStartedBody3}
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}

