"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { Copy } from "../copy/types";
import { CollapsibleCard } from "./ui/CollapsibleCard";
import { dehydrateTextForBrowser } from "../lib/clientVault";
import { SAMPLE_JD_BODY } from "../lib/sampleJobDescription";
import { tokensOnlyInFirst } from "../engine/labExtract/labIngestionDiff";

export interface LabConfigClient {
  harnessVersion: string;
  labCompleteEnabled: boolean;
  extractionModeIds: string[];
  allowedModelIds?: string[];
}

type LabModeApi =
  | {
      modeId: string;
      version: number;
      text: string;
      warnings: string[];
    }
  | {
      modeId: string;
      version: number;
      entries: { namespace: string; key: string; value: string }[];
      warnings: string[];
    }
  | {
      modeId: string;
      version: number;
      links: { target: string; scheme: string }[];
      warnings: string[];
    };

interface LabExtractResponse {
  harnessVersion: string;
  modes: LabModeApi[];
}

const TEXT_COMPARE_IDS = [
  "docx_forensic_body",
  "server_word_extractor",
  "server_mammoth_raw",
] as const;

function labelForMode(copy: Copy, modeId: string): string {
  switch (modeId) {
    case "docx_forensic_body":
      return copy.labHarnessModeDocxForensic;
    case "server_word_extractor":
      return copy.labHarnessModeServerWordExtractor;
    case "server_mammoth_raw":
      return copy.labHarnessModeServerMammoth;
    case "docx_package_metadata":
      return copy.labHarnessModePackageMetadata;
    case "docx_hyperlinks":
      return copy.labHarnessModeHyperlinks;
    default:
      return modeId;
  }
}

function getComparableText(modes: LabModeApi[], modeId: string): string {
  const m = modes.find((x) => x.modeId === modeId);
  if (m && "text" in m) return m.text;
  return "";
}

function renderModeBody(copy: Copy, m: LabModeApi): React.ReactNode {
  if ("text" in m) {
    return (
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-border bg-bg/80 p-2 font-mono text-caption text-foreground/90">
        {m.text || "—"}
      </pre>
    );
  }
  if ("entries" in m) {
    if (m.entries.length === 0) {
      return <p className="text-caption text-foreground/60">{copy.labHarnessMetadataEmpty}</p>;
    }
    return (
      <ul className="max-h-48 space-y-1 overflow-auto text-caption text-foreground/85">
        {m.entries.map((e, i) => (
          <li key={`${e.namespace}-${e.key}-${i}`}>
            <span className="font-mono text-accent/90">{e.namespace}</span>{" "}
            <span className="font-semibold">{e.key}</span>: {e.value}
          </li>
        ))}
      </ul>
    );
  }
  if (m.links.length === 0) {
    return <p className="text-caption text-foreground/60">{copy.labHarnessHyperlinksEmpty}</p>;
  }
  return (
    <ul className="max-h-48 space-y-1 overflow-auto font-mono text-caption text-foreground/90">
      {m.links.map((l, i) => (
        <li key={`${l.target}-${i}`}>
          <span className="text-accent/80">[{l.scheme}]</span>{" "}
          <a
            href={l.target}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-accent underline-offset-2 hover:text-success"
          >
            {l.target}
          </a>
        </li>
      ))}
    </ul>
  );
}

export interface LabHarnessPanelProps {
  copy: Copy;
  /** Word file selected on the main console, when any. */
  consoleSelectedDocxFile: File | null;
  /** Last successful inject output for this tab (in-memory File), when any. */
  hardenedOutputDocxFile: File | null;
}

function activeSourceCaption(
  copy: Copy,
  active: File,
  pick: File | null,
  hardened: File | null,
  consoleSel: File | null
): string {
  if (pick !== null && pick === active) {
    return copy.labHarnessSourcePicked.replace("{name}", active.name);
  }
  if (hardened !== null && hardened === active) {
    return copy.labHarnessSourceHardenedOutput.replace("{name}", active.name);
  }
  if (consoleSel !== null && consoleSel === active) {
    return copy.labHarnessSourceConsoleSelection.replace("{name}", active.name);
  }
  return copy.labHarnessSourceConsoleSelection.replace("{name}", active.name);
}

export const LabHarnessPanel: React.FC<LabHarnessPanelProps> = ({
  copy,
  consoleSelectedDocxFile,
  hardenedOutputDocxFile,
}) => {
  const [config, setConfig] = useState<LabConfigClient | null>(null);
  const [pickFile, setPickFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabExtractResponse | null>(null);
  const [leftMode, setLeftMode] = useState<string>(TEXT_COMPARE_IDS[0]!);
  const [rightMode, setRightMode] = useState<string>(TEXT_COMPARE_IDS[2]!);
  const [jdInput, setJdInput] = useState(SAMPLE_JD_BODY);
  const [modelId, setModelId] = useState("");
  const [extractForCompleteMode, setExtractForCompleteMode] =
    useState<string>("server_mammoth_raw");
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [completeText, setCompleteText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/lab/config");
        const j = (await res.json()) as LabConfigClient;
        if (!cancelled) {
          setConfig(j);
          if (j.allowedModelIds?.length) {
            setModelId(j.allowedModelIds[0]!);
          }
        }
      } catch {
        if (!cancelled) setConfig(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeFile =
    pickFile ?? hardenedOutputDocxFile ?? consoleSelectedDocxFile;

  // New underlying file → old extract results are misleading.
  useEffect(() => {
    setResult(null);
    setCompleteText(null);
    setCompleteError(null);
  }, [activeFile]);

  const runExtract = useCallback(async () => {
    if (!activeFile) {
      setError(copy.labHarnessNoFile);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setCompleteText(null);
    try {
      const fd = new FormData();
      fd.append("file", activeFile);
      const res = await fetch("/api/lab/extract", { method: "POST", body: fd });
      const j = (await res.json()) as { error?: string } & Partial<LabExtractResponse>;
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : copy.labHarnessError);
        return;
      }
      if (!j.modes || !j.harnessVersion) {
        setError(copy.labHarnessError);
        return;
      }
      setResult(j as LabExtractResponse);
    } catch {
      setError(copy.labHarnessError);
    } finally {
      setLoading(false);
    }
  }, [activeFile, copy]);

  const leftText = useMemo(
    () => (result ? getComparableText(result.modes, leftMode) : ""),
    [result, leftMode]
  );
  const rightText = useMemo(
    () => (result ? getComparableText(result.modes, rightMode) : ""),
    [result, rightMode]
  );
  const onlyLeft = useMemo(() => tokensOnlyInFirst(leftText, rightText), [leftText, rightText]);
  const onlyRight = useMemo(() => tokensOnlyInFirst(rightText, leftText), [leftText, rightText]);

  const runComplete = useCallback(async () => {
    if (!result || !config?.labCompleteEnabled) return;
    const extractRaw = getComparableText(result.modes, extractForCompleteMode);
    if (!extractRaw.trim()) {
      setCompleteError(copy.labHarnessCompleteError);
      return;
    }
    setCompleteLoading(true);
    setCompleteError(null);
    setCompleteText(null);
    try {
      const ex = dehydrateTextForBrowser(extractRaw);
      const jd = dehydrateTextForBrowser(jdInput);
      const res = await fetch("/api/lab/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptTemplateId: "lab_fit_summary_v1",
          extractText: ex.tokenizedText,
          jobDescriptionText: jd.tokenizedText,
          modelId: modelId.trim(),
        }),
      });
      const j = (await res.json()) as { error?: string; text?: string };
      if (!res.ok) {
        setCompleteError(typeof j.error === "string" ? j.error : copy.labHarnessCompleteError);
        return;
      }
      setCompleteText(typeof j.text === "string" ? j.text : "");
    } catch {
      setCompleteError(copy.labHarnessCompleteError);
    } finally {
      setCompleteLoading(false);
    }
  }, [result, config, extractForCompleteMode, jdInput, modelId, copy]);

  return (
    <div
      id="validation-lab-harness"
      className="mb-6 scroll-mt-6"
      data-testid="lab-harness-root"
    >
      <CollapsibleCard
        title={
          <span className="font-sans text-sm font-medium text-foreground/90">
            {copy.labHarnessTitle}
          </span>
        }
        titleId="lab-harness-title"
        contentId="lab-harness-content"
        ariaLabel={`${copy.labHarnessTitle}: show or hide`}
        defaultExpanded
        className="rounded-lg border border-border/80 bg-panel/40"
      >
        <p className="mb-3 text-sm leading-relaxed text-foreground/75">{copy.labHarnessIntro}</p>

        {activeFile ? (
          <p className="mb-2 font-mono text-caption text-foreground/65">
            {activeSourceCaption(
              copy,
              activeFile,
              pickFile,
              hardenedOutputDocxFile,
              consoleSelectedDocxFile
            )}
          </p>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-border/60 bg-bg/50 px-3 py-2 text-caption text-foreground/80 hover:border-accent/40">
            <span>{copy.labHarnessPickFile}</span>
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              data-testid="lab-harness-file-input"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setPickFile(f);
              }}
            />
          </label>
          <button
            type="button"
            data-testid="lab-harness-run-extract"
            disabled={loading || !activeFile}
            onClick={() => void runExtract()}
            className={clsx(
              "inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-caption font-semibold uppercase tracking-[0.12em]",
              "border-accent/45 bg-accent/10 text-accent hover:border-accent/70 hover:bg-accent/15",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              (!activeFile || loading) && "pointer-events-none opacity-50"
            )}
          >
            {loading ? copy.labHarnessExtractLoading : copy.labHarnessRunExtract}
          </button>
        </div>

        {error ? (
          <p className="mb-3 text-sm text-red-400/90" role="alert">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="space-y-4" data-testid="lab-harness-results">
            <p className="font-mono text-caption text-foreground/50">
              harnessVersion={result.harnessVersion}
            </p>
            {result.modes.map((m) => (
              <div key={m.modeId} data-testid={`lab-harness-mode-${m.modeId}`}>
                <h4 className="mb-1 font-mono text-caption font-semibold uppercase tracking-wider text-accent/90">
                  {labelForMode(copy, m.modeId)}
                </h4>
                {renderModeBody(copy, m)}
                {m.warnings.length > 0 ? (
                  <p className="mt-1 text-caption text-amber-400/90">
                    {copy.labHarnessWarnings}: {m.warnings.join("; ")}
                  </p>
                ) : null}
              </div>
            ))}

            <div className="rounded-lg border border-border/60 bg-bg/30 p-3">
              <h4 className="mb-2 font-mono text-caption font-semibold text-accent/90">
                {copy.labHarnessCompareTitle}
              </h4>
              <p className="mb-2 text-caption text-foreground/65">
                {copy.labHarnessServerWordVsMammothNote}
              </p>
              <div className="mb-2 grid gap-2 sm:grid-cols-2">
                <label className="block text-caption text-foreground/70">
                  {copy.labHarnessCompareLeft}
                  <select
                    className="mt-1 w-full rounded border border-border bg-bg px-2 py-1.5 font-mono text-caption text-foreground"
                    value={leftMode}
                    onChange={(e) => setLeftMode(e.target.value)}
                  >
                    {TEXT_COMPARE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {labelForMode(copy, id)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-caption text-foreground/70">
                  {copy.labHarnessCompareRight}
                  <select
                    className="mt-1 w-full rounded border border-border bg-bg px-2 py-1.5 font-mono text-caption text-foreground"
                    value={rightMode}
                    onChange={(e) => setRightMode(e.target.value)}
                  >
                    {TEXT_COMPARE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {labelForMode(copy, id)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-caption text-foreground/55">{copy.labHarnessOnlyInLeft}</p>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded border border-border/50 bg-panel/40 p-2 font-mono text-caption text-foreground/85">
                    {onlyLeft.length ? onlyLeft.join(" ") : "—"}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-caption text-foreground/55">{copy.labHarnessOnlyInRight}</p>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded border border-border/50 bg-panel/40 p-2 font-mono text-caption text-foreground/85">
                    {onlyRight.length ? onlyRight.join(" ") : "—"}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {config?.labCompleteEnabled && result ? (
          <div
            className="mt-4 rounded-lg border border-accent/30 bg-panel/30 p-3"
            data-testid="lab-harness-complete-panel"
          >
            <h4 className="mb-1 font-mono text-caption font-semibold text-accent">
              {copy.labHarnessCompleteTitle}
            </h4>
            <p className="mb-2 text-sm text-foreground/70">{copy.labHarnessCompleteIntro}</p>
            <p className="mb-2 text-caption text-foreground/55">{copy.labHarnessVendorDisclaimer}</p>
            <label className="mb-2 block text-caption text-foreground/70">
              {copy.labHarnessModelLabel}
              <select
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1.5 font-mono text-caption"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              >
                {(config.allowedModelIds ?? []).map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-2 block text-caption text-foreground/70">
              {copy.labHarnessExtractSourceLabel}
              <select
                className="mt-1 w-full rounded border border-border bg-bg px-2 py-1.5 font-mono text-caption"
                value={extractForCompleteMode}
                onChange={(e) => setExtractForCompleteMode(e.target.value)}
              >
                {TEXT_COMPARE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {labelForMode(copy, id)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-2 block text-caption text-foreground/70">
              {copy.labHarnessJdLabel}
              <textarea
                className="mt-1 min-h-[100px] w-full rounded border border-border bg-bg px-2 py-1.5 font-sans text-sm text-foreground"
                value={jdInput}
                onChange={(e) => setJdInput(e.target.value)}
              />
            </label>
            {completeError ? (
              <p className="mb-2 text-sm text-red-400/90" role="alert">
                {completeError}
              </p>
            ) : null}
            <button
              type="button"
              data-testid="lab-harness-run-complete"
              disabled={completeLoading || !modelId.trim()}
              onClick={() => void runComplete()}
              className={clsx(
                "inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-caption font-semibold uppercase tracking-[0.12em]",
                "border-accent/45 bg-accent/10 text-accent hover:border-accent/70",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                (completeLoading || !modelId.trim()) && "pointer-events-none opacity-50"
              )}
            >
              {completeLoading ? copy.labHarnessCompleteLoading : copy.labHarnessCompleteSubmit}
            </button>
            {completeText !== null ? (
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-border bg-bg/80 p-2 font-sans text-sm text-foreground/90">
                {completeText}
              </pre>
            ) : null}
          </div>
        ) : null}
      </CollapsibleCard>
    </div>
  );
};
