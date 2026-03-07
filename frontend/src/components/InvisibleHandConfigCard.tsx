"use client";

import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";

const MAX_PAYLOAD_LENGTH = 500;

export interface InvisibleHandConfigCardProps {
  /** Current trap text payload; controlled from parent. */
  payload?: string;
  /** Called when user changes payload; parent should set payloads["invisible-hand"]. */
  onPayloadChange: (payload: string) => void;
  disabled?: boolean;
  className?: string;
}

export const InvisibleHandConfigCard: React.FC<InvisibleHandConfigCardProps> = ({
  payload = "",
  onPayloadChange,
  disabled = false,
  className,
}) => {
  const [trapText, setTrapText] = useState(payload);

  useEffect(() => {
    setTrapText(payload);
  }, [payload]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_PAYLOAD_LENGTH) {
        setTrapText(value);
        onPayloadChange(value);
      }
    },
    [onPayloadChange]
  );

  return (
    <div
      className={clsx(
        "rounded-xl border border-noir-border bg-noir-panel/70 p-4 noir-shell",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
      aria-labelledby="invisible-hand-card-title"
    >
      <h3
        id="invisible-hand-card-title"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan mb-3"
        title="OWASP LLM01: Injects a 0.5pt white system note for AI parsers; invisible to humans, readable by LLMs."
      >
        The Invisible Hand (LLM01)
      </h3>
      <p
        className="text-[10px] text-noir-foreground/70 mb-4"
        title="Leave blank to use the default system note."
      >
        Optional custom trap text for AI parsers. Leave blank to use the default system note (0.5pt white, invisible to humans).
      </p>

      <label className="block">
        <span className="sr-only">Trap text (optional)</span>
        <textarea
          value={trapText}
          onChange={handleChange}
          placeholder="Leave blank to use default system note."
          maxLength={MAX_PAYLOAD_LENGTH}
          rows={3}
          disabled={disabled}
          className="w-full rounded border border-noir-border bg-noir-bg px-2 py-1.5 text-xs text-noir-foreground placeholder:text-noir-foreground/40 focus:border-neon-cyan focus:outline-none resize-y"
          title="Optional. Leave blank to use default system note. Max 500 characters."
          aria-describedby="invisible-hand-hint"
        />
        <p id="invisible-hand-hint" className="text-[10px] text-noir-foreground/50 mt-1">
          {trapText.length}/{MAX_PAYLOAD_LENGTH} characters. No HTML or script; letters, digits, spaces, and basic punctuation only.
        </p>
      </label>

      <div
        className="mt-4 pt-4 border-t border-noir-border"
        role="region"
        aria-labelledby="invisible-hand-manual-title"
      >
        <h4
          id="invisible-hand-manual-title"
          className="text-[10px] uppercase tracking-wider text-noir-foreground/80 mb-2"
        >
          Do it manually
        </h4>
        <p
          className="text-[10px] text-noir-foreground/70"
          title="Instructions to add the same invisible trap text manually in your own PDF or Word document."
        >
          To add this manually in your own file: in a PDF, insert text at the top of the first page in 0.5pt size and white color so it is invisible to humans but still readable by parsers. In Word, add a paragraph with 1pt font and white color, then save as PDF if needed. The goal is invisible-to-humans, readable-by-LLMs system-style text.
        </p>
      </div>
    </div>
  );
};
