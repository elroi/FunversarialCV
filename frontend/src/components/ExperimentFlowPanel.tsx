"use client";

import React from "react";
import type { Copy } from "../copy/types";

/**
 * Above-the-fold onboarding block: mission label, positioning line, numbered flow,
 * and subordinate footer note. Renders inside a distinct terminal-style panel
 * with clear hierarchy and spacing.
 */
export function ExperimentFlowPanel({ copy }: { copy: Copy }) {
  return (
    <div
      className="mb-6 border border-border/80 bg-panel/60 font-mono shadow-[0_0_0_1px_var(--color-accent)/0.06]"
      role="region"
      aria-labelledby="experiment-flow-label"
    >
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <h2
          id="experiment-flow-label"
          className="mb-3 text-caption font-mono uppercase tracking-[0.2em] text-accent"
        >
          {copy.experimentFlowLabel}
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-foreground/90">
          {copy.positioningLine}
        </p>
        <ol className="list-inside list-decimal space-y-2 pl-3 font-mono text-sm leading-relaxed text-foreground/85">
          {copy.flowSteps.map((step, i) => (
            <li key={i} className="pl-1">
              {step.split("\n").map((line, j) => (
                <React.Fragment key={j}>
                  {j > 0 && <br />}
                  {j === 0 ? (
                    line
                  ) : (
                    <span className="text-foreground/55 text-xs">{line}</span>
                  )}
                </React.Fragment>
              ))}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs italic leading-relaxed text-foreground/50">
          {copy.philosophyLine}
        </p>
      </div>
    </div>
  );
}
