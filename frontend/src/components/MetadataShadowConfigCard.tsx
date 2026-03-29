"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Trash2 } from "lucide-react";
import { CollapsibleCard } from "./ui/CollapsibleCard";
import { CheckAndValidateBlock } from "./CheckAndValidateBlock";
import { useCopy } from "../copy";
import type { Copy } from "../copy/types";
import {
  MAX_CUSTOM_KEYS,
  MAX_VALUE_LENGTH,
  KEY_PATTERN,
  STANDARD_FIELD_KEYS,
  getMetadataShadowUiIssues,
  hydrateMetadataShadowUi,
  serializeMetadataShadowPayload,
  type CustomRow,
  type MetadataShadowUiIssue,
  type StandardFieldState,
} from "../eggs/metadataShadowPayload";

function newRowId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Distinct property names with valid key + non-empty value (for add-row cap). */
function countUniqueValidCustomKeys(rows: CustomRow[]): number {
  const seen = new Set<string>();
  for (const row of rows) {
    const k = row.key.trim();
    const v = row.value.trim();
    if (k && v && KEY_PATTERN.test(k)) seen.add(k);
  }
  return seen.size;
}

function metadataShadowIssueMessage(
  issue: MetadataShadowUiIssue,
  copy: Copy
): string {
  switch (issue.code) {
    case "custom_key_required":
      return copy.metadataShadowErrKeyRequired;
    case "custom_value_required":
      return copy.metadataShadowErrValueRequired;
    case "custom_invalid_key":
      return copy.metadataShadowErrInvalidKey;
    case "custom_value_too_long":
      return copy.metadataShadowErrValueTooLong;
    case "custom_pii":
      return copy.metadataShadowErrPiiValue;
    case "custom_duplicate_key":
      return copy.metadataShadowErrDuplicateKey.replace(/\{key\}/g, issue.key);
    case "custom_too_many_keys":
      return copy.metadataShadowErrTooManyKeys;
    case "standard_too_long":
      return copy.metadataShadowErrStandardTooLong;
    case "standard_pii":
      return copy.metadataShadowErrPiiStandard;
    default:
      return "";
  }
}

function CharMeter({
  length,
  maxLen,
}: {
  length: number;
  maxLen: number;
}): React.ReactElement {
  const pct = Math.min(100, (length / maxLen) * 100);
  const near = length / maxLen > 0.9;
  return (
    <div
      className="h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-foreground/10"
      aria-hidden
    >
      <div
        className={clsx(
          "h-full rounded-full transition-[width] duration-150",
          near ? "bg-warning" : "bg-accent"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const stdFieldBaseClass =
  "w-full min-w-0 resize-y overflow-y-auto overflow-x-hidden rounded border border-border bg-bg px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none min-h-[4.5rem] max-h-40";

export interface MetadataShadowConfigCardProps {
  payload?: string;
  onPayloadChange: (payload: string) => void;
  disabled?: boolean;
  className?: string;
  /** Instructions for manual check and validation (from GET /api/eggs). */
  manualCheckAndValidation?: string;
}

export const MetadataShadowConfigCard: React.FC<MetadataShadowConfigCardProps> = ({
  payload,
  onPayloadChange,
  disabled = false,
  className,
  manualCheckAndValidation,
}) => {
  const copy = useCopy();
  /** Stable across SSR + hydration; do not use row.id in DOM ids (UUIDs differ server/client). */
  const customFieldDomId = useId();
  const skipHydrateOnce = useRef(true);

  const [initialBundle] = useState(() =>
    hydrateMetadataShadowUi(payload ?? "{}", newRowId)
  );
  const [rows, setRows] = useState<CustomRow[]>(initialBundle.rows);
  const [standard, setStandard] = useState<StandardFieldState>(
    initialBundle.standard
  );

  useEffect(() => {
    if (skipHydrateOnce.current) {
      skipHydrateOnce.current = false;
      return;
    }
    const h = hydrateMetadataShadowUi(payload ?? "{}", newRowId);
    setRows(h.rows);
    setStandard(h.standard);
  }, [payload]);

  const uiIssues = useMemo(
    () => getMetadataShadowUiIssues(rows, standard),
    [rows, standard]
  );

  const derived = useMemo(
    () => serializeMetadataShadowPayload(rows, standard),
    [rows, standard]
  );

  useEffect(() => {
    if (derived === null) return;
    const prev = payload ?? "";
    if (derived !== prev) {
      onPayloadChange(derived);
    }
  }, [derived, payload, onPayloadChange]);

  const uniqueValidKeyCount = useMemo(
    () => countUniqueValidCustomKeys(rows),
    [rows]
  );
  const canAddRow = uniqueValidKeyCount < MAX_CUSTOM_KEYS;

  const addRow = () => {
    if (!canAddRow) return;
    setRows((r) => [...r, { id: newRowId(), key: "", value: "" }]);
  };

  const removeRow = (id: string) => {
    setRows((r) => {
      if (r.length <= 1) {
        return [{ id: newRowId(), key: "", value: "" }];
      }
      return r.filter((row) => row.id !== id);
    });
  };

  const updateRow = (id: string, patch: Partial<Pick<CustomRow, "key" | "value">>) => {
    setRows((r) =>
      r.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const handleKeyChange = (id: string, raw: string) => {
    if (KEY_PATTERN.test(raw) || raw === "") {
      updateRow(id, { key: raw });
    }
  };

  const handleValueChange = (id: string, raw: string) => {
    if (raw.length <= MAX_VALUE_LENGTH) {
      updateRow(id, { value: raw });
    }
  };

  const setStd = (key: (typeof STANDARD_FIELD_KEYS)[number], value: string) => {
    if (value.length <= MAX_VALUE_LENGTH) {
      setStandard((s) => ({ ...s, [key]: value }));
    }
  };

  const hasGlobalTooMany = uiIssues.some((i) => i.code === "custom_too_many_keys");

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

      {uiIssues.length > 0 ? (
        <p
          role="status"
          className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-caption text-foreground/85"
        >
          {copy.metadataShadowPayloadStaleHint}
          {hasGlobalTooMany ? (
            <span className="mt-1 block text-foreground/80">
              {copy.metadataShadowErrTooManyKeys}
            </span>
          ) : null}
        </p>
      ) : null}

      <fieldset className="space-y-4" disabled={disabled}>
        <legend className="text-caption uppercase tracking-wider text-foreground/80 mb-0">
          {copy.metadataShadowCustomLegend}
        </legend>
        <p className="text-caption text-foreground/50 -mt-1">
          {copy.metadataShadowPropertyKeyFormatHint}
        </p>
        <ul className="space-y-3 list-none p-0 m-0">
          {rows.map((row, index) => {
            const keyFieldId = `${customFieldDomId}-k-${index}`;
            const valFieldId = `${customFieldDomId}-v-${index}`;
            const isFirstRow = index === 0;
            const keyLabelClass =
              "text-caption text-foreground/70 " +
              (isFirstRow ? "block" : "block sm:sr-only");
            const valLabelClass =
              "text-caption text-foreground/70 " +
              (isFirstRow ? "block" : "block sm:sr-only");
            const valueCountId = `${valFieldId}-count`;
            const valueErrId = `${valFieldId}-err`;

            const rowIssues = uiIssues.filter(
              (i): i is MetadataShadowUiIssue & { rowIndex: number } =>
                "rowIndex" in i && i.rowIndex === index
            );
            const keyIssues = rowIssues.filter((i) =>
              ["custom_key_required", "custom_invalid_key"].includes(i.code)
            );
            const valueIssues = rowIssues.filter((i) =>
              [
                "custom_value_required",
                "custom_value_too_long",
                "custom_pii",
                "custom_duplicate_key",
              ].includes(i.code)
            );

            const describedByValue = [
              valueCountId,
              valueIssues.length ? valueErrId : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <li key={row.id}>
                <div className="relative rounded-md border border-border/80 bg-bg/40 px-3 py-3 pr-11 ring-1 ring-inset ring-foreground/[0.04] sm:pr-12">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={disabled}
                    title={`${copy.metadataShadowRemoveRow} ${index + 1}`}
                    className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/90 bg-bg/80 text-foreground/70 shadow-sm backdrop-blur-sm hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                    aria-label={`${copy.metadataShadowRemoveRow} ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </button>
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-3">
                    <div className="w-full min-w-0 space-y-1.5 lg:w-[11rem] lg:shrink-0">
                      <label className={keyLabelClass} htmlFor={keyFieldId}>
                        {copy.metadataShadowPropertyName}
                      </label>
                      <input
                        id={keyFieldId}
                        type="text"
                        value={row.key}
                        onChange={(e) => handleKeyChange(row.id, e.target.value)}
                        placeholder={copy.metadataShadowPlaceholderKey}
                        disabled={disabled}
                        aria-invalid={keyIssues.length > 0}
                        aria-describedby={
                          keyIssues.length ? `${keyFieldId}-err` : undefined
                        }
                        className={clsx(
                          "h-9 w-full min-w-0 rounded border bg-bg px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none",
                          keyIssues.length > 0
                            ? "border-warning focus:border-warning"
                            : "border-border focus:border-accent"
                        )}
                        aria-label={`${copy.metadataShadowPropertyName} ${index + 1}`}
                      />
                      {keyIssues.length > 0 ? (
                        <p
                          id={`${keyFieldId}-err`}
                          role="alert"
                          className="text-caption text-warning"
                        >
                          {[
                            ...new Set(
                              keyIssues.map((i) =>
                                metadataShadowIssueMessage(i, copy)
                              )
                            ),
                          ].join(" ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <label className={valLabelClass} htmlFor={valFieldId}>
                        {copy.metadataShadowPropertyValue}
                      </label>
                      <textarea
                        id={valFieldId}
                        value={row.value}
                        onChange={(e) =>
                          handleValueChange(row.id, e.target.value)
                        }
                        placeholder={copy.metadataShadowPlaceholderValue}
                        maxLength={MAX_VALUE_LENGTH}
                        disabled={disabled}
                        rows={3}
                        aria-invalid={valueIssues.length > 0}
                        aria-describedby={
                          describedByValue.length > 0
                            ? describedByValue
                            : undefined
                        }
                        className={clsx(
                          stdFieldBaseClass,
                          valueIssues.length > 0
                            ? "border-warning focus:border-warning"
                            : "border-border"
                        )}
                        aria-label={`${copy.metadataShadowPropertyValue} ${index + 1}`}
                      />
                      <CharMeter
                        length={row.value.length}
                        maxLen={MAX_VALUE_LENGTH}
                      />
                      <div className="flex justify-end">
                        <span
                          id={valueCountId}
                          className="select-none text-caption tabular-nums text-foreground/45"
                        >
                          {row.value.length}/{MAX_VALUE_LENGTH}
                        </span>
                      </div>
                      {valueIssues.length > 0 ? (
                        <p
                          id={valueErrId}
                          role="alert"
                          className="text-caption text-warning"
                        >
                          {[
                            ...new Set(
                              valueIssues.map((i) =>
                                metadataShadowIssueMessage(i, copy)
                              )
                            ),
                          ].join(" ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="pt-1">
          <button
            type="button"
            onClick={addRow}
            disabled={disabled || !canAddRow}
            className="rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-foreground/5 focus:border-accent focus:outline-none disabled:opacity-50"
          >
            {copy.metadataShadowAddProperty}
          </button>
        </div>
        <p className="text-caption text-foreground/50">
          No email or phone in values. {copy.metadataShadowCustomKeyCap}
        </p>
      </fieldset>

      <div
        className="mt-6 pt-4 border-t border-border space-y-3"
        role="region"
        aria-labelledby="metadata-shadow-standard-heading"
      >
        <h3
          id="metadata-shadow-standard-heading"
          className="text-caption uppercase tracking-wider text-foreground/80"
        >
          {copy.metadataShadowStandardSectionTitle}
        </h3>
        <p className="text-caption text-foreground/60">{copy.metadataShadowStandardScope}</p>

        {(
          [
            {
              field: "title" as const,
              id: "meta-std-title",
              label: copy.metadataShadowStandardTitle,
            },
            {
              field: "subject" as const,
              id: "meta-std-subject",
              label: copy.metadataShadowStandardSubject,
            },
            {
              field: "author" as const,
              id: "meta-std-author",
              label: copy.metadataShadowStandardAuthor,
              hintId: "meta-std-author-hint",
              hint: copy.metadataShadowAuthorLabNote,
            },
            {
              field: "keywords" as const,
              id: "meta-std-keywords",
              label: copy.metadataShadowStandardKeywords,
            },
          ] as const
        ).map((spec) => {
          const val = standard[spec.field];
          const countId = `${spec.id}-count`;
          const errId = `${spec.id}-err`;
          const fieldIssues = uiIssues.filter(
            (i): i is Extract<MetadataShadowUiIssue, { field: typeof spec.field }> =>
              (i.code === "standard_pii" || i.code === "standard_too_long") &&
              "field" in i &&
              i.field === spec.field
          );
          const errMsgs = [
            ...new Set(fieldIssues.map((i) => metadataShadowIssueMessage(i, copy))),
          ];
          const describedBy = [
            countId,
            "hintId" in spec && spec.hintId ? spec.hintId : "",
            errMsgs.length ? errId : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={spec.field}>
              <label
                className="block text-caption text-foreground/70 mb-1"
                htmlFor={spec.id}
              >
                {spec.label}
              </label>
              <textarea
                id={spec.id}
                value={val}
                onChange={(e) => setStd(spec.field, e.target.value)}
                maxLength={MAX_VALUE_LENGTH}
                disabled={disabled}
                rows={3}
                aria-invalid={fieldIssues.length > 0}
                aria-describedby={describedBy.length > 0 ? describedBy : undefined}
                className={clsx(
                  stdFieldBaseClass,
                  fieldIssues.length > 0
                    ? "border-warning focus:border-warning"
                    : "border-border"
                )}
              />
              <div className="mt-1 space-y-1">
                <CharMeter length={val.length} maxLen={MAX_VALUE_LENGTH} />
                <div className="flex justify-end">
                  <span
                    id={countId}
                    className="select-none text-caption tabular-nums text-foreground/45"
                  >
                    {val.length}/{MAX_VALUE_LENGTH}
                  </span>
                </div>
              </div>
              {errMsgs.length > 0 ? (
                <p id={errId} role="alert" className="text-caption text-warning mt-1">
                  {errMsgs.join(" ")}
                </p>
              ) : null}
              {"hint" in spec && spec.hint ? (
                <p id={spec.hintId} className="text-caption text-foreground/50 mt-1">
                  {spec.hint}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

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
