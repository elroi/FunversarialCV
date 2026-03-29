"use client";

import React from "react";
import clsx from "clsx";
import { useAudience, type CopyFadePhase } from "../contexts/AudienceContext";

function phaseOpacityClass(phase: CopyFadePhase): string {
  switch (phase) {
    case "fadeOut":
      return "opacity-0";
    case "between":
      return "opacity-0 transition-none";
    case "fadeIn":
      return "opacity-100";
    case "idle":
    default:
      return "opacity-100";
  }
}

function phaseTransitionClass(phase: CopyFadePhase): string {
  if (phase === "between" || phase === "idle") {
    return "";
  }
  return "audience-copy-fade-shell-transition";
}

/**
 * Wraps audience-dependent copy below {@link SiteTopBar}. Opacity is orchestrated with
 * {@link AudienceProvider}'s `copyFadePhase` so copy swaps only while fully faded out.
 */
export function AudienceCopyFadeShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { copyFadePhase } = useAudience();

  return (
    <div
      className={clsx(
        phaseTransitionClass(copyFadePhase),
        phaseOpacityClass(copyFadePhase),
        className
      )}
      aria-busy={copyFadePhase !== "idle" ? "true" : "false"}
    >
      {children}
    </div>
  );
}
