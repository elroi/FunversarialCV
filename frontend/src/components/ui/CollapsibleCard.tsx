"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";

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
  /** When true, trigger and content are not interactive (e.g. when egg is disabled). */
  disabled?: boolean;
}

/**
 * Collapsible card: title row is always visible and acts as a button to expand/collapse the body.
 * Default collapsed on all viewports; one tab stop, 44px min height, full-width trigger.
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
        "rounded-xl border border-border bg-panel/70 noir-shell overflow-hidden",
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
        className="flex w-full min-h-[44px] flex-shrink-0 items-center justify-between gap-2 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-inset"
      >
        <span className="text-caption sm:text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {title}
        </span>
        <span className="shrink-0 text-accent" aria-hidden="true">
          {expanded ? "▼" : "▶"}
        </span>
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={titleId}
        className={expanded ? "block border-t border-border p-4" : "hidden"}
      >
        {children}
      </div>
    </div>
  );
};
