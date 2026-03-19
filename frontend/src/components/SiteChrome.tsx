"use client";

import Link from "next/link";
import { useCopy } from "../copy";
import { AudienceSwitcher } from "./AudienceSwitcher";

/**
 * Shared marketing header (H1 + tagline) for home and resources.
 * Keeps layout and spacing consistent across routes (DRY, avoids mobile drift).
 */
export function SiteHeader() {
  const copy = useCopy();

  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-border pb-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          <span className="bg-gradient-to-r from-success via-accent to-success bg-clip-text text-transparent">
            FunversarialCV
          </span>
        </h1>
        <p className="text-sm leading-relaxed text-foreground/70">{copy.tagline}</p>
      </div>
    </header>
  );
}

export type SiteTopBarNavLink = {
  href: string;
  label: string;
};

/**
 * Privacy badge + audience switcher + engine status + secondary nav.
 * Mobile-first: column stack and wrapping flex so nothing overflows horizontally.
 */
export function SiteTopBar({ navLink }: { navLink: SiteTopBarNavLink }) {
  const copy = useCopy();

  // Touch-friendly height on narrow viewports; compact pills from sm+ (persona: 44px mobile).
  const pillClass =
    "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full border px-3 py-2 text-caption uppercase tracking-[0.15em] sm:min-h-0 sm:px-3 sm:py-1 sm:text-xs sm:tracking-[0.2em]";

  return (
    <div
      className="mb-3 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"
      role="toolbar"
      aria-label="Site navigation and audience"
    >
      <p className="min-w-0 text-caption font-mono uppercase leading-snug tracking-[0.15em] text-accent/80 sm:shrink-0 sm:text-xs sm:tracking-[0.2em]">
        {copy.piiModeBadge}
      </p>
      <div className="flex min-w-0 w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
        <AudienceSwitcher />
        <span
          className={`${pillClass} border-success/60 bg-panel text-success engine-online-pulse`}
        >
          {copy.engineOnline}
        </span>
        <Link
          href={navLink.href}
          className={`${pillClass} border-accent/70 text-accent hover:border-success hover:text-success focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
        >
          {navLink.label}
        </Link>
      </div>
    </div>
  );
}
