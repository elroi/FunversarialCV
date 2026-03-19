"use client";

import React from "react";
import { useAudience } from "../contexts/AudienceContext";
import { useCopy } from "../copy";

export function AudienceSwitcher() {
  const { audience, setAudience } = useAudience();
  const copy = useCopy();

  return (
    <div
      className="flex rounded-full border border-border bg-panel/80 p-0.5 text-caption sm:text-xs"
      role="group"
      aria-label="Audience"
    >
      <button
        type="button"
        onClick={() => setAudience("security")}
        className={`rounded-full px-3 py-1.5 uppercase tracking-wide transition ${
          audience === "security"
            ? "bg-accent text-accent-foreground font-medium"
            : "text-foreground/80 hover:text-foreground hover:bg-border/50"
        }`}
        aria-pressed={audience === "security"}
      >
        {copy.audienceSecurity}
      </button>
      <button
        type="button"
        onClick={() => setAudience("hr")}
        className={`rounded-full px-3 py-1.5 uppercase tracking-wide transition ${
          audience === "hr"
            ? "bg-accent text-accent-foreground font-medium"
            : "text-foreground/80 hover:text-foreground hover:bg-border/50"
        }`}
        aria-pressed={audience === "hr"}
      >
        {copy.audienceHr}
      </button>
    </div>
  );
}
