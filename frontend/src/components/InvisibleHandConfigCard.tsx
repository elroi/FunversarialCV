"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CollapsibleCard } from "./ui/CollapsibleCard";
import { CheckAndValidateBlock } from "./CheckAndValidateBlock";

const MAX_PAYLOAD_LENGTH = 500;

export interface InvisibleHandConfigCardProps {
  /** Current trap text payload; controlled from parent. */
  payload?: string;
  /** Called when user changes payload; parent should set payloads["invisible-hand"]. */
  onPayloadChange: (payload: string) => void;
  disabled?: boolean;
  className?: string;
  /** Instructions for manual check and validation (from GET /api/eggs). */
  manualCheckAndValidation?: string;
}

export const InvisibleHandConfigCard: React.FC<InvisibleHandConfigCardProps> = ({
  payload = "",
  onPayloadChange,
  disabled = false,
  className,
  manualCheckAndValidation,
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
    <CollapsibleCard
      title={
        <span className="flex flex-col gap-0.5">
          <span>The Invisible Hand (LLM01)</span>
          <span className="text-[9px] font-mono text-noir-foreground/60">
            STYLE-AFFECTING
          </span>
        </span>
      }
      titleId="invisible-hand-card-title"
      contentId="invisible-hand-card-content"
      ariaLabel="Expand The Invisible Hand config"
      defaultExpanded={false}
      disabled={disabled}
      className={className}
    >
      <p
        className="text-[10px] sm:text-xs text-noir-foreground/70 mb-4"
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
        <p id="invisible-hand-hint" className="text-[10px] sm:text-xs text-noir-foreground/50 mt-1">
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
          className="text-[10px] sm:text-xs uppercase tracking-wider text-noir-foreground/80 mb-2"
        >
          How to check &amp; validate
        </h4>
        {manualCheckAndValidation ? (
          <CheckAndValidateBlock
            content={manualCheckAndValidation}
            fallback={
              <p className="text-[10px] sm:text-xs text-noir-foreground/50 italic">
                Instructions not available. Ensure the app can reach /api/eggs.
              </p>
            }
          />
        ) : (
          <p className="text-[10px] sm:text-xs text-noir-foreground/50 italic">
            Instructions not available. Ensure the app can reach /api/eggs.
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
};
