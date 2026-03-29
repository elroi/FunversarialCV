"use client";

import Link from "next/link";
import clsx from "clsx";
import { hrCopy, securityCopy, useCopy } from "../copy";
import { useAudience } from "../contexts/AudienceContext";
import { AudienceSwitcher } from "./AudienceSwitcher";

export type SiteHeaderNavLink = {
  href: string;
  label: string;
};

export type SiteHeaderProps = {
  /** Secondary navigation (e.g. Resources on home, Back home on /resources). Plain link, not a pill. */
  secondaryNav?: SiteHeaderNavLink;
  /** Optional classes on the tagline paragraph (e.g. motion accents). */
  taglineClassName?: string;
};

/**
 * Shared marketing header (H1 + tagline) for home and resources.
 * Keeps layout and spacing consistent across routes (DRY, avoids mobile drift).
 */
export function SiteHeader({ secondaryNav, taglineClassName }: SiteHeaderProps) {
  const copy = useCopy();
  const { contentAudience } = useAudience();
  const headerFont = contentAudience === "hr" ? "font-sans" : "";

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
        <p
          className={clsx(
            "text-sm leading-relaxed text-foreground/70",
            taglineClassName
          )}
        >
          {copy.tagline}
        </p>
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
 * Stacked opacity crossfade between security vs HR privacy lines (same layout cell; inactive copy is aria-hidden).
 */
function PrivacyModeBadge() {
  const { contentAudience } = useAudience();
  const lineClass =
    "col-start-1 row-start-1 min-w-0 text-caption font-mono uppercase leading-snug tracking-[0.15em] text-accent/80 sm:text-xs sm:tracking-[0.2em]";

  return (
    <p
      className="theme-toolbar-badge-crossfade grid min-w-0 sm:shrink-0"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        className={`${lineClass} ${contentAudience === "security" ? "z-[1] opacity-100" : "z-0 opacity-0"}`}
        aria-hidden={contentAudience !== "security"}
      >
        {securityCopy.piiModeBadge}
      </span>
      <span
        className={`${lineClass} ${contentAudience === "hr" ? "z-[1] opacity-100" : "z-0 opacity-0"}`}
        aria-hidden={contentAudience !== "hr"}
      >
        {hrCopy.piiModeBadge}
      </span>
    </p>
  );
}

/**
 * Trust line + audience switcher. Navigation lives in SiteHeader as a text link.
 */
export function SiteTopBar() {
  return (
    <div
      className="theme-crossfade-skip mb-4 flex w-full min-w-0 flex-col gap-3 sm:mb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"
      role="toolbar"
      aria-label="Privacy note and audience"
    >
      <PrivacyModeBadge />
      <div className="flex w-full min-w-0 sm:w-auto sm:justify-end">
        <AudienceSwitcher />
      </div>
    </div>
  );
}
