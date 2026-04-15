"use client";

import React from "react";
import { useAudience } from "../contexts/AudienceContext";
import { useCopy } from "../copy";

export function AudienceSwitcher() {
  const { audience, setAudience } = useAudience();
  const copy = useCopy();

  return (
    <div
      className="flex w-full min-w-0 max-w-full rounded-full border border-border bg-panel/80 p-0.5 text-caption sm:w-auto sm:text-xs"
      role="group"
      aria-label={`Choose audience: ${copy.audienceSecurity} or ${copy.audienceHr}`}
    >
      <button
        type="button"
        onClick={() => setAudience("security")}
        title={copy.audienceSecurityHint}
        className={`min-h-[44px] flex-1 rounded-full px-2 py-2 uppercase tracking-wide sm:min-h-0 sm:flex-none sm:px-3 sm:py-1.5 ${
          audience === "security"
            ? "bg-accent text-accent-foreground font-medium"
            : "text-foreground/80 hover:text-foreground hover:bg-border/50"
        }`}
        aria-pressed={audience === "security"}
      >
        <span className="block">{copy.audienceSecurity}</span>
        <span className="hidden sm:block normal-case tracking-normal text-[0.6rem] leading-tight opacity-60 mt-0.5 font-normal">
          {copy.audienceSecurityHint}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setAudience("hr")}
        title={copy.audienceHrHint}
        className={`min-h-[44px] flex-1 rounded-full px-2 py-2 uppercase tracking-wide sm:min-h-0 sm:flex-none sm:px-3 sm:py-1.5 ${
          audience === "hr"
            ? "bg-accent text-accent-foreground font-medium"
            : "text-foreground/80 hover:text-foreground hover:bg-border/50"
        }`}
        aria-pressed={audience === "hr"}
      >
        <span className="block">{copy.audienceHr}</span>
        <span className="hidden sm:block normal-case tracking-normal text-[0.6rem] leading-tight opacity-60 mt-0.5 font-normal">
          {copy.audienceHrHint}
        </span>
      </button>
    </div>
  );
}
