"use client";

import Link from "next/link";
import { useCopy } from "../copy";
import { useAudience } from "../contexts/AudienceContext";
import { AudienceSwitcher } from "./AudienceSwitcher";

/**
 * Shared marketing header (H1 + tagline) for home and resources.
 * Keeps layout and spacing consistent across routes (DRY, avoids mobile drift).
 */
export function SiteHeader() {
  const copy = useCopy();
  const { audience } = useAudience();
  const headerFont = audience === "hr" ? "font-sans" : "";

  return (
    <header
      className={`mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-border pb-4 ${headerFont}`}
    >
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

  // Mobile: equal-width READY + RESOURCES row so they read as one control group (not orphaned left).
  // Touch-friendly height on narrow viewports; compact pills from sm+.
  const pillClass =
    "inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center rounded-full border px-2 py-2 text-center text-caption uppercase tracking-[0.12em] sm:min-h-0 sm:w-auto sm:flex-none sm:shrink-0 sm:px-3 sm:py-1 sm:text-xs sm:tracking-[0.2em]";

  return (
    <div
      className="mb-3 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"
      role="toolbar"
      aria-label="Site navigation and audience"
    >
      <p className="min-w-0 text-caption font-mono uppercase leading-snug tracking-[0.15em] text-accent/80 sm:shrink-0 sm:text-xs sm:tracking-[0.2em]">
        {copy.piiModeBadge}
      </p>
      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
        <AudienceSwitcher />
        <div className="flex w-full min-w-0 gap-2 sm:w-auto sm:shrink-0 sm:gap-2">
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
    </div>
  );
}
