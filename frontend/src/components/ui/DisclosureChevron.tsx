import React from "react";
import clsx from "clsx";

export interface DisclosureChevronProps {
  expanded: boolean;
  className?: string;
}

/**
 * Shared expand/collapse glyph for SectionFold, CollapsibleCard, and similar triggers.
 * `text-sm` and fixed box size sit cleanly next to caption-sized titles with trigger `items-center`.
 */
export function DisclosureChevron({
  expanded,
  className,
}: DisclosureChevronProps): React.ReactElement {
  return (
    <span
      className={clsx(
        "inline-flex size-5 shrink-0 items-center justify-center text-sm leading-none text-accent",
        className
      )}
      aria-hidden="true"
    >
      {expanded ? "▼" : "▶"}
    </span>
  );
}
