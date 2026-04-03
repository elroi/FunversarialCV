"use client";

import React from "react";
import type { Copy } from "../copy/types";
import { useAudience } from "../contexts/AudienceContext";
import { renderFlowStepLine } from "../lib/flowStepRichText";

/** Inner content for experiment steps (used inside CollapsibleCard on home or inside the standalone panel). */
export function ExperimentFlowPanelBody({
  copy,
  showPositioningLine = true,
}: {
  copy: Copy;
  /** When false, skip the positioning line (e.g. home page shows it once above the upload area). */
  showPositioningLine?: boolean;
}) {
  const { contentAudience } = useAudience();
  const isHr = contentAudience === "hr";
  const panelFont = isHr ? "font-sans" : "font-mono";

  return (
    <div className={`px-3 py-3 sm:px-5 sm:py-4 ${panelFont}`}>
      <h2
        id="experiment-flow-label"
        className={`text-caption uppercase tracking-[0.2em] text-accent ${showPositioningLine ? "mb-3" : "mb-4"}`}
      >
        {copy.experimentFlowLabel}
      </h2>
      {showPositioningLine ? (
        <p className="mb-4 text-sm leading-relaxed text-foreground/90">
          {copy.positioningLine}
        </p>
      ) : null}
      <ol className="list-outside list-decimal space-y-2 pl-5 text-[0.9375rem] leading-relaxed text-foreground/85 sm:pl-6 sm:text-sm">
        {copy.flowSteps.map((step, i) => (
          <li key={i} className="pl-1">
            {step.split("\n").map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {j === 0 ? (
                  renderFlowStepLine(line)
                ) : (
                  <span className="text-foreground/55 text-xs">
                    {renderFlowStepLine(line)}
                  </span>
                )}
              </React.Fragment>
            ))}
          </li>
        ))}
      </ol>
      {copy.experimentFlowClarifier && (
        <p className="mt-3 text-sm leading-relaxed text-foreground/70">
          {copy.experimentFlowClarifier}
        </p>
      )}
      <p className="mt-3 text-xs italic leading-relaxed text-foreground/50">
        {copy.philosophyLine}
      </p>
    </div>
  );
}

/**
 * Standalone bordered panel (e.g. Storybook or alternate layouts). Home uses
 * {@link ExperimentFlowPanelBody} inside {@link CollapsibleCard}.
 */
export function ExperimentFlowPanel({ copy }: { copy: Copy }) {
  return (
    <div
      className="mb-6 min-w-0 border border-border/80 bg-panel/60 shadow-[0_0_0_1px_var(--color-accent)/0.06]"
      role="region"
      aria-labelledby="experiment-flow-label"
    >
      <ExperimentFlowPanelBody copy={copy} />
    </div>
  );
}
