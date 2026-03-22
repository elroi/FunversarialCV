"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { DisclosureChevron } from "./DisclosureChevron";

export interface SectionFoldProps {
  /** Visible section title (uppercase caption style applied on trigger). */
  title: React.ReactNode;
  titleId: string;
  contentId: string;
  ariaLabel: string;
  /** When true, body is shown on first paint (matches pre-fold layout). */
  defaultExpanded?: boolean;
  /** Outer wrapper classes (e.g. `functional-group mt-6 p-4`). */
  className?: string;
  /** Optional DOM id for deep links / anchors. */
  sectionId?: string;
  children: React.ReactNode;
}

/**
 * Major page section with the same heading look as static `functional-group` captions,
 * plus expand/collapse. Does not add an inner card border (unlike CollapsibleCard).
 */
export const SectionFold: React.FC<SectionFoldProps> = ({
  title,
  titleId,
  contentId,
  ariaLabel,
  defaultExpanded = true,
  className,
  sectionId,
  children,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div id={sectionId} className={className}>
      <button
        type="button"
        id={titleId}
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={ariaLabel}
        onClick={() => setExpanded((e) => !e)}
        className="mb-4 flex w-full min-h-[44px] items-center justify-between gap-2 rounded-sm text-left text-caption uppercase tracking-[0.2em] text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <span>{title}</span>
        <DisclosureChevron expanded={expanded} />
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={titleId}
        hidden={!expanded}
        className={clsx(expanded ? "block" : "hidden")}
      >
        {children}
      </div>
    </div>
  );
};
