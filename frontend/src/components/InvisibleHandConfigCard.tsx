"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CollapsibleCard } from "./ui/CollapsibleCard";
import { CheckAndValidateBlock } from "./CheckAndValidateBlock";
import { useCopy, replaceCopyPlaceholders } from "../copy";

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
  const copy = useCopy();
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
          <span>{copy.eggInvisibleHandTitle}</span>
          <span className="text-xs font-mono text-foreground/60">
            {copy.styleAffecting}
          </span>
        </span>
      }
      titleId="invisible-hand-card-title"
      contentId="invisible-hand-card-content"
      ariaLabel={`Expand ${copy.eggInvisibleHandTitle} config`}
      defaultExpanded={false}
      disabled={disabled}
      className={className}
    >
      <p
        className="text-caption sm:text-sm text-foreground/70 mb-4"
        title={copy.invisibleHandPlaceholder}
      >
        {copy.invisibleHandDescription}
      </p>

      <label className="block">
        <span className="sr-only">{copy.invisibleHandTrapLabel}</span>
        <textarea
          value={trapText}
          onChange={handleChange}
          placeholder={copy.invisibleHandPlaceholder}
          maxLength={MAX_PAYLOAD_LENGTH}
          rows={3}
          disabled={disabled}
          className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none resize-y"
          title={copy.invisibleHandPlaceholder}
          aria-describedby="invisible-hand-hint"
        />
        <p id="invisible-hand-hint" className="text-caption sm:text-xs text-foreground/50 mt-1">
          {replaceCopyPlaceholders(copy.invisibleHandHint, { n: trapText.length, max: MAX_PAYLOAD_LENGTH })}
        </p>
      </label>

      <div
        className="mt-4 pt-4 border-t border-border"
        role="region"
        aria-labelledby="invisible-hand-manual-title"
      >
        <h4
          id="invisible-hand-manual-title"
          className="text-caption sm:text-xs uppercase tracking-wider text-foreground/80 mb-2"
        >
          {copy.invisibleHandHowToTitle}
        </h4>
        {manualCheckAndValidation ? (
          <CheckAndValidateBlock
            content={manualCheckAndValidation}
            fallback={
              <p className="text-caption sm:text-xs text-foreground/50 italic">
                Instructions not available. Ensure the app can reach /api/eggs.
              </p>
            }
          />
        ) : (
          <p className="text-caption sm:text-xs text-foreground/50 italic">
            Instructions not available. Ensure the app can reach /api/eggs.
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
};
