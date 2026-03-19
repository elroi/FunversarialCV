"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CollapsibleCard } from "./ui/CollapsibleCard";
import { CheckAndValidateBlock } from "./CheckAndValidateBlock";
import { useCopy } from "../copy";

const KEY_PATTERN = /^[a-zA-Z0-9_]*$/;
const MAX_VALUE_LENGTH = 200;

export interface MetadataShadowConfigCardProps {
  payload?: string;
  onPayloadChange: (payload: string) => void;
  disabled?: boolean;
  className?: string;
  /** Instructions for manual check and validation (from GET /api/eggs). */
  manualCheckAndValidation?: string;
}

function parsePayloadSafe(payload: string | undefined): Record<string, string> {
  if (!payload?.trim()) return {};
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export const MetadataShadowConfigCard: React.FC<MetadataShadowConfigCardProps> = ({
  payload,
  onPayloadChange,
  disabled = false,
  className,
  manualCheckAndValidation,
}) => {
  const copy = useCopy();
  const config = parsePayloadSafe(payload);
  const [key, setKey] = useState(
    Object.keys(config)[0] ?? copy.metadataShadowPlaceholderKey
  );
  const [value, setValue] = useState(
    Object.keys(config).length ? config[Object.keys(config)[0]] ?? "" : copy.metadataShadowPlaceholderValue
  );

  useEffect(() => {
    const keys = Object.keys(config);
    if (keys.length) {
      setKey(keys[0]);
      setValue(config[keys[0]] ?? "");
    }
    // Don't reset to empty - keep default "Ranking: Top_1_Percent" when payload is empty
  }, [payload, config]);

  const emit = useCallback(
    (k: string, v: string) => {
      const trimmedKey = k.trim();
      const trimmedValue = v.trim();
      if (!trimmedKey || !trimmedValue) {
        onPayloadChange("{}");
        return;
      }
      if (!KEY_PATTERN.test(trimmedKey)) return;
      if (trimmedValue.length > MAX_VALUE_LENGTH) return;
      onPayloadChange(JSON.stringify({ [trimmedKey]: trimmedValue }));
    },
    [onPayloadChange]
  );

  useEffect(() => {
    emit(key, value);
  }, [key, value, emit]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (KEY_PATTERN.test(next) || next === "") setKey(next);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (next.length <= MAX_VALUE_LENGTH) setValue(next);
  };

  return (
    <CollapsibleCard
      title={
        <span className="flex flex-col gap-0.5">
          <span>{copy.eggMetadataShadowTitle}</span>
          <span className="text-xs font-mono text-foreground/60">
            {copy.styleSafe}
          </span>
        </span>
      }
      titleId="metadata-shadow-card-title"
      contentId="metadata-shadow-card-content"
      ariaLabel={`Expand ${copy.eggMetadataShadowTitle} config`}
      defaultExpanded={false}
      disabled={disabled}
      className={className}
    >
      <p className="text-caption sm:text-sm text-foreground/70 mb-4">
        {copy.metadataShadowDescription}
      </p>

      <fieldset className="space-y-3">
        <div>
          <label className="block text-caption text-foreground/70 mb-1">
            {copy.metadataShadowPropertyName}
          </label>
          <input
            type="text"
            value={key}
            onChange={handleKeyChange}
            placeholder={copy.metadataShadowPlaceholderKey}
            disabled={disabled}
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none"
            aria-describedby="meta-key-hint"
          />
          <p id="meta-key-hint" className="text-caption text-foreground/50 mt-1">
            Letters, numbers, underscore only.
          </p>
        </div>
        <div>
          <label className="block text-caption text-foreground/70 mb-1">
            {copy.metadataShadowPropertyValue}
          </label>
          <input
            type="text"
            value={value}
            onChange={handleValueChange}
            placeholder={copy.metadataShadowPlaceholderValue}
            maxLength={MAX_VALUE_LENGTH}
            disabled={disabled}
            className="w-full rounded border border-border bg-bg px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none"
            aria-describedby="meta-value-hint"
          />
          <p id="meta-value-hint" className="text-caption text-foreground/50 mt-1">
            {value.length}/{MAX_VALUE_LENGTH}. No email or phone.
          </p>
        </div>
      </fieldset>

      <div
        className="mt-4 pt-4 border-t border-border"
        role="region"
        aria-labelledby="metadata-shadow-check-validate-title"
      >
        <h4
          id="metadata-shadow-check-validate-title"
          className="text-caption uppercase tracking-wider text-foreground/80 mb-2"
        >
          {copy.metadataShadowHowToTitle}
        </h4>
        {manualCheckAndValidation ? (
          <CheckAndValidateBlock
            content={manualCheckAndValidation}
            className="text-caption text-foreground/70"
            fallback={
              <p className="text-caption text-foreground/50 italic">
                Instructions not available. Ensure the app can reach /api/eggs.
              </p>
            }
          />
        ) : (
          <p className="text-caption text-foreground/50 italic">
            Instructions not available. Ensure the app can reach /api/eggs.
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
};
