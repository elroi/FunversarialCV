"use client";

import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { CollapsibleCard } from "./ui/CollapsibleCard";

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
  const config = parsePayloadSafe(payload);
  const [key, setKey] = useState(
    Object.keys(config)[0] ?? "Ranking"
  );
  const [value, setValue] = useState(
    Object.keys(config).length ? config[Object.keys(config)[0]] ?? "" : ""
  );

  useEffect(() => {
    const keys = Object.keys(config);
    if (keys.length) {
      setKey(keys[0]);
      setValue(config[keys[0]] ?? "");
    } else {
      setKey("Ranking");
      setValue("");
    }
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
      title="The Metadata Shadow (LLM02)"
      titleId="metadata-shadow-card-title"
      contentId="metadata-shadow-card-content"
      ariaLabel="Expand Metadata Shadow config"
      defaultExpanded={false}
      disabled={disabled}
      className={className}
    >
      <p className="text-[10px] sm:text-xs text-noir-foreground/70 mb-4">
        Add a custom document property (e.g. Ranking: Top_1%). Keys: letters, numbers, underscore only. No PII in values.
      </p>

      <fieldset className="space-y-3">
        <div>
          <label className="block text-[10px] text-noir-foreground/70 mb-1">
            Property name
          </label>
          <input
            type="text"
            value={key}
            onChange={handleKeyChange}
            placeholder="Ranking"
            disabled={disabled}
            className="w-full rounded border border-noir-border bg-noir-bg px-2 py-1.5 text-xs text-noir-foreground placeholder:text-noir-foreground/40 focus:border-neon-cyan focus:outline-none"
            aria-describedby="meta-key-hint"
          />
          <p id="meta-key-hint" className="text-[10px] text-noir-foreground/50 mt-1">
            Letters, numbers, underscore only.
          </p>
        </div>
        <div>
          <label className="block text-[10px] text-noir-foreground/70 mb-1">
            Value
          </label>
          <input
            type="text"
            value={value}
            onChange={handleValueChange}
            placeholder="Top_1%"
            maxLength={MAX_VALUE_LENGTH}
            disabled={disabled}
            className="w-full rounded border border-noir-border bg-noir-bg px-2 py-1.5 text-xs text-noir-foreground placeholder:text-noir-foreground/40 focus:border-neon-cyan focus:outline-none"
            aria-describedby="meta-value-hint"
          />
          <p id="meta-value-hint" className="text-[10px] text-noir-foreground/50 mt-1">
            {value.length}/{MAX_VALUE_LENGTH}. No email or phone.
          </p>
        </div>
      </fieldset>

      <div
        className="mt-4 pt-4 border-t border-noir-border"
        role="region"
        aria-labelledby="metadata-shadow-check-validate-title"
      >
        <h4
          id="metadata-shadow-check-validate-title"
          className="text-[10px] uppercase tracking-wider text-noir-foreground/80 mb-2"
        >
          How to check &amp; validate
        </h4>
        {manualCheckAndValidation ? (
          <p className="text-[10px] text-noir-foreground/70">
            {manualCheckAndValidation}
          </p>
        ) : (
          <p className="text-[10px] text-noir-foreground/50 italic">
            Instructions not available. Ensure the app can reach /api/eggs.
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
};
