"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { DisclosureChevron } from "./DisclosureChevron";

const MD_MIN_WIDTH = "(min-width: 768px)";

export interface CollapsibleCardProps {
  /** Title shown in the always-visible trigger row. */
  title: React.ReactNode;
  /** Unique id for the title/trigger (for aria-labelledby on content). */
  titleId: string;
  /** Unique id for the content panel (for aria-controls on trigger). */
  contentId: string;
  /** Accessible label for the expand/collapse button (e.g. "Expand The Invisible Hand config"). */
  ariaLabel: string;
  /** Initial expanded state. Default false so cards start collapsed on all viewports. */
  defaultExpanded?: boolean;
  /**
   * When true, sync expanded state with `md` breakpoint after mount (expanded on wide, collapsed on narrow).
   * User toggles still work; resize updates state so desktop readers see steps without a long mobile scroll.
   */
  expandOnWide?: boolean;
  /** Card content; shown when expanded. */
  children: React.ReactNode;
  /** Optional class for the outer card wrapper. */
  className?: string;
  /**
   * When set, replaces the default title typography (uppercase tracking used for egg cards).
   * Use for prose-style titles such as privacy summaries.
   */
  titleClassName?: string;
  /** When true, trigger and content are not interactive (e.g. when egg is disabled). */
  disabled?: boolean;
}

/**
 * Collapsible card: title row is always visible and acts as a button to expand/collapse the body.
 * Compact trigger (`min-h-10`, `px-3 py-2`) keeps label and chevron visually tight; `items-center`
 * vertically centers label and glyph in the row.
 */
export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  titleId,
  contentId,
  ariaLabel,
  defaultExpanded = false,
  expandOnWide = false,
  children,
  className,
  titleClassName,
  disabled = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (!expandOnWide || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MD_MIN_WIDTH);
    const apply = () => setExpanded(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [expandOnWide]);

  return (
    <div
      className={clsx(
        "w-full min-w-0 rounded-xl border border-border bg-panel/70 noir-shell overflow-hidden",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
    >
      <button
        type="button"
        id={titleId}
        aria-expanded={expanded}
        aria-controls={contentId}
        aria-label={ariaLabel}
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full min-h-10 flex-shrink-0 items-center justify-between gap-1.5 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-inset"
      >
        <span
          className={clsx(
            "min-w-0",
            titleClassName ??
              "text-caption sm:text-xs font-semibold uppercase tracking-[0.2em] text-accent"
          )}
        >
          {title}
        </span>
        <DisclosureChevron expanded={expanded} />
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={titleId}
        className={expanded ? "block border-t border-border p-3" : "hidden"}
      >
        {children}
      </div>
    </div>
  );
};
