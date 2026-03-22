import React from "react";
import clsx from "clsx";

export interface DisclosureChevronProps {
  expanded: boolean;
  className?: string;
}

/**
 * Shared expand/collapse glyph for SectionFold, CollapsibleCard, and similar triggers.
 * Sized independently of parent `text-caption` so major sections match card disclosures.
 */
export function DisclosureChevron({
  expanded,
  className,
}: DisclosureChevronProps): React.ReactElement {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center text-lg leading-none text-accent",
        className
      )}
      aria-hidden="true"
    >
      {expanded ? "▼" : "▶"}
    </span>
  );
}
