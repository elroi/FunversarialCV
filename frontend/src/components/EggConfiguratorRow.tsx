"use client";

import React from "react";
import clsx from "clsx";
import { DisclosureChevron } from "./ui/DisclosureChevron";

export interface EggConfiguratorRowProps {
  /** Stable id segment for DOM ids (e.g. `invisible-hand`). */
  eggDomId: string;
  /** Whether this egg is included in the pipeline run. */
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  /** Row title (primary line). */
  title: React.ReactNode;
  /** Subtitle (e.g. STYLE-AFFECTING). */
  subtitle: React.ReactNode;
  /** Expanded payload / configuration panel. */
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  /** Accessible name for the expand control (e.g. "Expand The Invisible Hand configuration"). */
  expandAriaLabel: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * One engine egg: enable checkbox (separate from disclosure), optional expanded config body.
 * Avoids nesting checkbox inside the disclosure button for accessibility.
 */
export const EggConfiguratorRow: React.FC<EggConfiguratorRowProps> = ({
  eggDomId,
  enabled,
  onEnabledChange,
  title,
  subtitle,
  expanded,
  onExpandedChange,
  expandAriaLabel,
  children,
  className,
}) => {
  const checkboxId = `egg-enable-${eggDomId}`;
  const contentId = `egg-config-${eggDomId}`;
  const expandBtnId = `egg-expand-${eggDomId}`;

  return (
    <div
      className={clsx(
        "w-full min-w-0 rounded-xl border border-border bg-panel/70 noir-shell overflow-hidden",
        className
      )}
      data-testid={`engine-egg-row-${eggDomId}`}
    >
      <div className="flex min-h-[44px] items-stretch gap-2 px-2 py-1.5 sm:px-3 sm:gap-3">
        <div className="flex shrink-0 items-start pt-2">
          <input
            id={checkboxId}
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent/50"
            aria-describedby={`${eggDomId}-row-label`}
          />
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <label
            id={`${eggDomId}-row-label`}
            htmlFor={checkboxId}
            className="block cursor-pointer text-left"
          >
            <span className="block text-caption sm:text-xs font-semibold uppercase tracking-[0.2em] text-accent leading-snug">
              {title}
            </span>
            <span className="mt-0.5 block text-xs font-mono text-foreground/60">
              {subtitle}
            </span>
          </label>
        </div>
        <div className="flex shrink-0 items-center self-stretch">
          <button
            type="button"
            id={expandBtnId}
            aria-expanded={expanded}
            aria-controls={contentId}
            aria-label={expandAriaLabel}
            onClick={() => onExpandedChange(!expanded)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md px-2 text-accent hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-inset"
          >
            <DisclosureChevron expanded={expanded} />
          </button>
        </div>
      </div>
      <div
        id={contentId}
        role="region"
        aria-labelledby={expandBtnId}
        className={expanded ? "block border-t border-border p-3" : "hidden"}
      >
        {children}
      </div>
    </div>
  );
};
