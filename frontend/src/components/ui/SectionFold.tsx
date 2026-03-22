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
  /** Outer wrapper classes (e.g. `functional-group mt-6`). Horizontal padding is applied inside the component to match `CollapsibleCard`. */
  className?: string;
  /** Optional DOM id for deep links / anchors. */
  sectionId?: string;
  children: React.ReactNode;
}

/**
 * Major page section with the same heading look as static `functional-group` captions,
 * plus expand/collapse. Does not add an inner card border (unlike CollapsibleCard).
 *
 * Trigger and body inset match `CollapsibleCard` (compact `px-3 py-2` trigger, `px-3` region).
 * Do not add outer padding on `className`; shell uses `pb-3` for bottom rhythm.
 *
 * Trigger uses `items-center` so the title and chevron are vertically centered in the row.
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
    <div id={sectionId} className={clsx("flex w-full min-w-0 flex-col pb-3", className)}>
      <button
        type="button"
        id={titleId}
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={ariaLabel}
        onClick={() => setExpanded((e) => !e)}
        className="mb-3 flex w-full min-h-10 flex-shrink-0 items-center justify-between gap-1.5 rounded-sm px-3 py-2 text-left text-caption uppercase tracking-[0.2em] text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <span className="min-w-0">{title}</span>
        <DisclosureChevron expanded={expanded} />
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={titleId}
        hidden={!expanded}
        className={clsx("min-w-0 px-3", expanded ? "block" : "hidden")}
      >
        {children}
      </div>
    </div>
  );
};
