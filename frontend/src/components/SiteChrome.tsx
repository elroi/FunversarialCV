"use client";

import Link from "next/link";
import { useCopy } from "../copy";
import { useAudience } from "../contexts/AudienceContext";
import { AudienceSwitcher } from "./AudienceSwitcher";

export type SiteHeaderNavLink = {
  href: string;
  label: string;
};

export type SiteHeaderProps = {
  /** Secondary navigation (e.g. Resources on home, Back home on /resources). Plain link, not a pill. */
  secondaryNav?: SiteHeaderNavLink;
};

/**
 * Shared marketing header (H1 + tagline) for home and resources.
 * Keeps layout and spacing consistent across routes (DRY, avoids mobile drift).
 */
export function SiteHeader({ secondaryNav }: SiteHeaderProps) {
  const copy = useCopy();
  const { audience } = useAudience();
  const headerFont = audience === "hr" ? "font-sans" : "";

  return (
    <header
      className={`mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border pb-4 ${headerFont}`}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          <span className="bg-gradient-to-r from-success via-accent to-success bg-clip-text text-transparent">
            FunversarialCV
          </span>
        </h1>
        <p className="text-sm leading-relaxed text-foreground/70">{copy.tagline}</p>
      </div>
      {secondaryNav ? (
        <Link
          href={secondaryNav.href}
          className="inline-flex min-h-[44px] shrink-0 items-center text-sm font-medium text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-success hover:decoration-success/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:min-h-0 sm:py-1"
        >
          {secondaryNav.label}
        </Link>
      ) : null}
    </header>
  );
}

/**
 * Trust line + audience switcher. Navigation lives in SiteHeader as a text link.
 */
export function SiteTopBar() {
  const copy = useCopy();

  return (
    <div
      className="mb-4 flex w-full min-w-0 flex-col gap-3 sm:mb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"
      role="toolbar"
      aria-label="Privacy note and audience"
    >
      <p className="min-w-0 text-caption font-mono uppercase leading-snug tracking-[0.15em] text-accent/80 sm:shrink-0 sm:text-xs sm:tracking-[0.2em]">
        {copy.piiModeBadge}
      </p>
      <div className="flex w-full min-w-0 sm:w-auto sm:justify-end">
        <AudienceSwitcher />
      </div>
    </div>
  );
}
