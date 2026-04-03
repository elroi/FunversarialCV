"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { DropZone } from "../src/components/DropZone";
import {
  DualityMonitor,
  type LogEntry,
  type ProcessingStageId,
  type ProcessingState,
} from "../src/components/DualityMonitor";
import { AudienceCopyFadeShell } from "../src/components/AudienceCopyFadeShell";
import { SiteHeader, SiteTopBar } from "../src/components/SiteChrome";
import { EggConfiguratorRow } from "../src/components/EggConfiguratorRow";
import { IncidentMailtoConfigBody } from "../src/components/IncidentMailtoConfigCard";
import { CanaryWingConfigBody } from "../src/components/CanaryWingConfigCard";
import { InvisibleHandConfigBody } from "../src/components/InvisibleHandConfigCard";
import { MetadataShadowConfigBody } from "../src/components/MetadataShadowConfigCard";
import { ValidationLab } from "../src/components/ValidationLab";
import { ExperimentFlowPanelBody } from "../src/components/ExperimentFlowPanel";
import * as ClientVault from "../src/lib/clientVault";
import { createDocumentWithTextInBrowser } from "../src/lib/clientDocumentCreate";
import * as ClientTokenReplace from "../src/lib/clientTokenReplaceInCopy";
import {
  decodeBase64ToUint8Array,
  detectDocumentTypeFromUint8Array,
} from "../src/lib/clientDocumentExtract";
import type { PiiMap } from "../src/lib/clientVaultTypes";
import type { DualityCheckResult } from "../src/engine/dualityCheck";
import {
  EGG_OPTIONS,
  DEFAULT_ENABLED_EGG_IDS,
  DEFAULT_METADATA_SHADOW_PAYLOAD,
} from "../src/eggs/eggMetadata";
import { Button } from "../src/components/ui/Button";
import { Card } from "../src/components/ui/Card";
import { CollapsibleCard } from "../src/components/ui/CollapsibleCard";
import { SectionFold } from "../src/components/ui/SectionFold";
import { useCopy } from "../src/copy";
import { useAudience } from "../src/contexts/AudienceContext";
import {
  ATTENTION_PULSE_CLASS,
  restartAttentionPulse,
} from "../src/lib/attentionPulse";

/** Must match API route MAX_BODY_BYTES so client rejects before sending. */
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

/** Delay before arming upload-channel in-view pulse so tagline pulse does not stack on first paint. */
const ATTENTION_PULSE_STAGGER_MS = 500;

/** Stable JSON for comparing egg payloads (key order from JSON.stringify can differ). */
function stableJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableJsonStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJsonStringify(obj[k])}`).join(",")}}`;
}

function eggPayloadsConfigurationEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  const ta = a.trim();
  const tb = b.trim();
  if (ta === "" && tb === "") return true;
  try {
    const pa = ta === "" ? {} : (JSON.parse(ta) as unknown);
    const pb = tb === "" ? {} : (JSON.parse(tb) as unknown);
    return stableJsonStringify(pa) === stableJsonStringify(pb);
  } catch {
    return false;
  }
}

/** PII notice paragraph; security audience gets blueish accent + inline "How to verify" expandable. */
function PiiNoticeBlock({
  copy,
  audience,
}: {
  copy: ReturnType<typeof useCopy>;
  audience: "security" | "hr";
}) {
  const [verifyExpanded, setVerifyExpanded] = useState(false);
  const isSecurity = audience === "security";

  return (
    <div className="mb-4">
      <p
        className={
          isSecurity
            ? "text-caption text-accent border-l-2 border-accent/60 pl-3 py-1"
            : "text-caption text-accent/90 border-l-2 border-accent/50 pl-3 py-1"
        }
      >
        {copy.piiNotice}
        {isSecurity && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setVerifyExpanded((e) => !e)}
              aria-expanded={verifyExpanded}
              aria-controls="pii-verify-content"
              id="pii-verify-trigger"
              className="font-mono text-accent underline underline-offset-2 hover:text-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg rounded"
            >
              {copy.verifyHowToAnchor}
              <span aria-hidden="true" className="ml-0.5">
                {verifyExpanded ? " ▼" : " ▸"}
              </span>
            </button>
          </>
        )}
      </p>
      {isSecurity && (
        <div
          id="pii-verify-content"
          role="region"
          aria-labelledby="pii-verify-trigger"
          className={verifyExpanded ? "mt-1.5 pl-3 border-l-2 border-accent/40 text-caption font-mono text-accent/90" : "hidden"}
        >
          {copy.verifyPayloadHint}
        </div>
      )}
    </div>
  );
}

/** Parse **bold** in a string into <strong> nodes. */
function parseBold(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground/90">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/** Render intro copy with paragraphs (\n\n), line breaks (\n), and **bold**. */
function renderIntro(text: string): React.ReactNode {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return paragraphs.map((para, i) => (
    <p key={i} className="mb-3 text-sm text-foreground/80 last:mb-6">
      {para.split("\n").map((line, j) => (
        <React.Fragment key={j}>
          {j > 0 && <br />}
          {parseBold(line)}
        </React.Fragment>
      ))}
    </p>
  ));
}

/** localStorage key for persisting checkbox state (Preserve styles + Eggs to run). */
const CHECKBOX_STORAGE_KEY = "funversarialcv-checkboxes";

function buildFinalFileName(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  if (dot <= 0 || dot === originalName.length - 1) {
    return `${originalName}_final`;
  }
  const base = originalName.slice(0, dot);
  const ext = originalName.slice(dot);
  return `${base}_final${ext}`;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");
  const [activeStage, setActiveStage] = useState<ProcessingStageId | undefined>(
    undefined
  );
  const [log, setLog] = useState<LogEntry[]>([]);
  const [dualityResult, setDualityResult] =
    useState<DualityCheckResult | null>(null);
  const [invisibleHandPayload, setInvisibleHandPayload] = useState<string>("");
  const [incidentMailtoPayload, setIncidentMailtoPayload] = useState<string>("");
  const [canaryWingPayload, setCanaryWingPayload] = useState<string>("");
  const [metadataShadowPayload, setMetadataShadowPayload] = useState<string>(
    DEFAULT_METADATA_SHADOW_PAYLOAD
  );
  const [enabledEggIds, setEnabledEggIds] = useState<Set<string>>(() => new Set(DEFAULT_ENABLED_EGG_IDS));
  /** Eggs applied in the last successful harden; drives Validation Lab ENABLED badge (not live checkboxes). */
  const [armedEggIds, setArmedEggIds] = useState<Set<string>>(() => new Set());
  const [preserveStyles, setPreserveStyles] = useState(true);
  const [preserveStylesDetailExpanded, setPreserveStylesDetailExpanded] =
    useState(false);
  /** Request server-built PDF (plain layout) with the same egg injections as the Word file. */
  const [includePdfExport, setIncludePdfExport] = useState(false);
  const [includePdfExportDetailExpanded, setIncludePdfExportDetailExpanded] =
    useState(false);
  const [eggRowExpanded, setEggRowExpanded] = useState<Record<string, boolean>>(
    () => ({})
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successMessageRef = useRef<HTMLParagraphElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const armedSectionRef = useRef<HTMLDivElement | null>(null);
  const inputChannelSectionRef = useRef<HTMLDivElement | null>(null);
  const inputChannelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const engineSectionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const validationLabTriggerRef = useRef<HTMLButtonElement | null>(null);
  const inputChannelPulsedRef = useRef(false);
  const lastHardenedBlobRef = useRef<Blob | null>(null);
  const lastHardenedPdfBlobRef = useRef<Blob | null>(null);
  const lastPdfExportFileNameRef = useRef<string | null>(null);
  const lastHardenedConfigRef = useRef<{
    payloads: Record<string, string>;
    eggIds: string[];
    preserveStyles: boolean;
    includePdfExport: boolean;
  } | null>(null);
  const openFilePickerRef = useRef<(() => void) | null>(null);
  /** True once the user has toggled an egg or preserve-styles; we only persist after that so we never overwrite saved state on load. */
  const userHasChangedCheckboxesRef = useRef(false);
  const [demoVariant, setDemoVariant] = useState<"clean" | "dirty">("clean");
  const [demoFormat, setDemoFormat] = useState<"pdf" | "docx">("docx");
  const [hasDemoLoaded, setHasDemoLoaded] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  /** Bumped when a CV is armed so Engine Configuration opens (it starts collapsed). */
  const [engineFoldExpandSignal, setEngineFoldExpandSignal] = useState(0);
  /** One-shot tagline accent after first paint (see attention pulse in globals.css). */
  const [taglineAttentionActive, setTaglineAttentionActive] = useState(false);
  /** Bumped after DOCX download to re-run Validation Lab trigger pulse. */
  const [validationLabPulseToken, setValidationLabPulseToken] = useState(0);
  const [clientPiiMap, setClientPiiMap] = useState<PiiMap | null>(null);

  /** Egg metadata from GET /api/eggs (id -> { name, manualCheckAndValidation }). */
  const [eggMetadataById, setEggMetadataById] = useState<Record<string, { name: string; manualCheckAndValidation: string }>>({});

  const copy = useCopy();
  const { contentAudience } = useAudience();

  /** When set, show confirmation dialog: PDF and eggs can only be processed by the server. */
  const [serverPdfConfirm, setServerPdfConfirm] = useState<{
    fileToSend: File;
    name: string;
    payloadsForEnabled: Record<string, string>;
    enabledEggIds: string[];
    preserveStyles: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof fetch !== "function") return;
    fetch("/api/eggs")
      .then((res) => res.ok ? res.json() : null)
      .then((data: { eggs?: Array<{ id: string; name: string; manualCheckAndValidation: string }> } | null) => {
        if (data?.eggs && Array.isArray(data.eggs)) {
          const byId: Record<string, { name: string; manualCheckAndValidation: string }> = {};
          for (const e of data.eggs) {
            byId[e.id] = { name: e.name, manualCheckAndValidation: e.manualCheckAndValidation };
          }
          setEggMetadataById(byId);
        }
      })
      .catch(() => { /* ignore; cards will hide section */ });
  }, []);

  // Tagline attention pulse once after mount (rAF avoids Strict Mode double-invoke stacking issues).
  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (!cancelled) setTaglineAttentionActive(true);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  // Upload channel: pulse fold trigger once when section scrolls into view (armed after stagger).
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let cancelled = false;
    const armTimer = window.setTimeout(() => {
      if (cancelled) return;
      const root = inputChannelSectionRef.current;
      if (!root || typeof IntersectionObserver === "undefined") return;
      observer = new IntersectionObserver(
        (entries) => {
          const hit = entries.some(
            (e) => e.isIntersecting && e.intersectionRatio >= 0.2
          );
          if (!hit || inputChannelPulsedRef.current) return;
          inputChannelPulsedRef.current = true;
          restartAttentionPulse(inputChannelTriggerRef.current);
          observer?.disconnect();
        },
        { threshold: 0.2 }
      );
      observer.observe(root);
    }, ATTENTION_PULSE_STAGGER_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(armTimer);
      observer?.disconnect();
    };
  }, []);

  // Engine ("Add signals") fold: pulse trigger whenever a CV is armed (expand signal bumps).
  useEffect(() => {
    if (engineFoldExpandSignal === 0) return;
    const t = window.setTimeout(() => {
      restartAttentionPulse(engineSectionTriggerRef.current);
    }, 250);
    return () => window.clearTimeout(t);
  }, [engineFoldExpandSignal]);

  // Validation Lab: pulse trigger after each successful DOCX download click.
  useEffect(() => {
    if (validationLabPulseToken === 0) return;
    const t = window.setTimeout(() => {
      restartAttentionPulse(validationLabTriggerRef.current);
    }, 0);
    return () => window.clearTimeout(t);
  }, [validationLabPulseToken]);

  // Scroll focused success/error targets into view after render (refs are set post-commit).
  useEffect(() => {
    if (successMessage && successMessageRef.current && typeof successMessageRef.current.scrollIntoView === "function") {
      successMessageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [successMessage]);
  useEffect(() => {
    if (error && retryButtonRef.current && typeof retryButtonRef.current.scrollIntoView === "function") {
      retryButtonRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  // After the engine fold opens, scroll to Armed CV (fold content may paint one frame later).
  useEffect(() => {
    if (engineFoldExpandSignal === 0) return;
    const t = window.setTimeout(() => {
      const el = armedSectionRef.current;
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [engineFoldExpandSignal]);

  // Hydrate checkbox state from localStorage on mount (client-only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CHECKBOX_STORAGE_KEY);
      if (raw != null) {
        const parsed = JSON.parse(raw) as { enabledEggIds?: unknown; preserveStyles?: unknown };
        const validEggIds = new Set<string>(EGG_OPTIONS.map((o) => o.id));
        if (Array.isArray(parsed.enabledEggIds)) {
          const filtered = parsed.enabledEggIds.filter((id): id is string => typeof id === "string" && validEggIds.has(id));
          setEnabledEggIds(filtered.length > 0 ? new Set(filtered) : new Set(DEFAULT_ENABLED_EGG_IDS));
        }
        if (typeof parsed.preserveStyles === "boolean") {
          setPreserveStyles(parsed.preserveStyles);
        }
      }
    } catch {
      // Corrupt or invalid JSON; keep defaults.
    }
  }, []);

  // Persist checkbox state to localStorage only after the user has changed it (avoids overwriting saved state on reload / Strict Mode).
  useEffect(() => {
    if (typeof window === "undefined" || !userHasChangedCheckboxesRef.current) return;
    try {
      window.localStorage.setItem(
        CHECKBOX_STORAGE_KEY,
        JSON.stringify({ enabledEggIds: [...enabledEggIds], preserveStyles })
      );
    } catch {
      // Quota or disabled localStorage; ignore.
    }
  }, [enabledEggIds, preserveStyles]);

  const setEggEnabled = useCallback((id: string, nextEnabled: boolean) => {
    userHasChangedCheckboxesRef.current = true;
    setEnabledEggIds((prev) => {
      const next = new Set(prev);
      if (nextEnabled) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /** Applies a validated file to pipeline state (clears prior run, errors, PII map). */
  const armPipelineWithFile = useCallback((file: File) => {
    setError(null);
    setSuccessMessage(null);
    setSelectedFile(file);
    setSelectedFileName(file.name);
    lastHardenedBlobRef.current = null;
    lastHardenedPdfBlobRef.current = null;
    lastPdfExportFileNameRef.current = null;
    lastHardenedConfigRef.current = null;
    setArmedEggIds(new Set());
    setDualityResult(null);
    setLog([]);
    setProcessingState("idle");
    setActiveStage(undefined);
    setClientPiiMap(null);
    setEngineFoldExpandSignal((n) => n + 1);
  }, []);

  /**
   * Sniff magic bytes and arm the pipeline with a .docx only.
   * Returns false when the file is rejected (error message already set).
   */
  const validateAndArmFile = async (file: File): Promise<boolean> => {
    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const detected = detectDocumentTypeFromUint8Array(head);
    if (detected === "pdf") {
      setError(
        "This file looks like a PDF. We currently support Word documents (.docx) only."
      );
      return false;
    }
    if (detected !== "docx") {
      setError(
        "File content is not a valid Word document. Please upload a real .docx file."
      );
      return false;
    }
    armPipelineWithFile(file);
    return true;
  };

  const onFileSelect = async (file: File) => {
    await validateAndArmFile(file);
  };

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setSelectedFileName(null);
    setError(null);
    setSuccessMessage(null);
    lastHardenedBlobRef.current = null;
    lastHardenedPdfBlobRef.current = null;
    lastPdfExportFileNameRef.current = null;
    lastHardenedConfigRef.current = null;
    setArmedEggIds(new Set());
    setDualityResult(null);
    setLog([]);
    setProcessingState("idle");
    setActiveStage(undefined);
  }, []);

  const triggerDownload = useCallback(() => {
    const blob = lastHardenedBlobRef.current;
    if (!blob || !successMessage) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = successMessage;
    a.click();
    URL.revokeObjectURL(url);
    setValidationLabPulseToken((n) => n + 1);
  }, [successMessage]);

  const triggerPdfDownload = useCallback(() => {
    const blob = lastHardenedPdfBlobRef.current;
    const fname = lastPdfExportFileNameRef.current;
    if (!blob || !fname || !successMessage) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
  }, [successMessage]);

  /** True if egg config (payloads or enabled set) has changed since last successful harden. */
  const haveEggsChanged = useCallback(() => {
    const snap = lastHardenedConfigRef.current;
    if (!snap) return false;
    const currentIds = [...enabledEggIds].sort();
    const snapIds = [...snap.eggIds].sort();
    if (
      currentIds.length !== snapIds.length ||
      currentIds.some((id, i) => id !== snapIds[i])
    ) {
      return true;
    }
    const payloads: Record<string, string> = {
      "invisible-hand": invisibleHandPayload,
      "incident-mailto": incidentMailtoPayload,
      "canary-wing": canaryWingPayload,
      "metadata-shadow": metadataShadowPayload,
    };
    const currentPayloads: Record<string, string> = {};
    for (const id of enabledEggIds) {
      if (payloads[id] !== undefined) currentPayloads[id] = payloads[id];
    }
    const snapKeys = Object.keys(snap.payloads).sort();
    const currentKeys = Object.keys(currentPayloads).sort();
    if (
      snapKeys.length !== currentKeys.length ||
      snapKeys.some((k, i) => k !== currentKeys[i])
    )
      return true;
    for (const id of snapKeys) {
      if (
        !eggPayloadsConfigurationEquivalent(
          currentPayloads[id] ?? "",
          snap.payloads[id] ?? ""
        )
      ) {
        return true;
      }
    }
    if (preserveStyles !== snap.preserveStyles) return true;
    if (includePdfExport !== (snap.includePdfExport ?? false)) return true;
    return false;
  }, [
    enabledEggIds,
    preserveStyles,
    includePdfExport,
    invisibleHandPayload,
    incidentMailtoPayload,
    canaryWingPayload,
    metadataShadowPayload,
  ]);

  // Gate the primary pipeline action after a successful run so users do not re-POST identical egg/config to /api/harden until selection or payloads drift.
  const lastHardenedSnap = lastHardenedConfigRef.current;
  const pipelineConfigMatchesLastSuccess =
    lastHardenedSnap !== null && !haveEggsChanged();
  const pipelineHardenDisabled =
    processingState === "processing" ||
    !selectedFile ||
    pipelineConfigMatchesLastSuccess;
  const pipelineHardenAria =
    processingState === "processing"
      ? copy.hardenAriaProcessing
      : pipelineConfigMatchesLastSuccess
        ? copy.hardenAriaAwaitingConfigChange
        : copy.hardenAriaDefault;

  const downloadReflectsStaleConfig =
    Boolean(successMessage) &&
    lastHardenedSnap !== null &&
    haveEggsChanged();

  /** Prominent centered Download only after real egg injection; scan-only stays compact. */
  const downloadSuccessHasInjectedEggs =
    Boolean(successMessage) &&
    (lastHardenedConfigRef.current?.eggIds?.length ?? 0) > 0;

  const runHarden = () => {
    if (!selectedFile) return;
    void startPipelineForFile(selectedFile);
  };

  /** Builds formData, POSTs to /api/harden, and handles response. Used by main flow and server-PDF confirm dialog. */
  const runSubmitToServer = useCallback(
    async (params: {
      fileToSend: File;
      name: string;
      eggIdsToUse: string[];
      payloadsForEnabled: Record<string, string>;
      preserveStyles: boolean;
      includePdfExport: boolean;
      piiMapForRehydrate: PiiMap | null;
      rehydrateMimeType: string | null;
    }) => {
      const {
        fileToSend,
        name,
        eggIdsToUse,
        payloadsForEnabled,
        preserveStyles,
        includePdfExport: includePdfExportParam,
        piiMapForRehydrate,
        rehydrateMimeType,
      } = params;
      const formData = new FormData();
      formData.append("file", fileToSend);
      formData.append("payloads", JSON.stringify(payloadsForEnabled));
      formData.append("eggIds", JSON.stringify(eggIdsToUse));
      if (preserveStyles) {
        formData.append("preserveStyles", "true");
      }
      if (includePdfExportParam) {
        formData.append("includePdfExport", "true");
      }

      try {
        const res = await fetch("/api/harden", { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const errMsg =
            typeof data?.error === "string" ? data.error : "Processing failed.";
          setError(errMsg);
          setProcessingState("error");
          setActiveStage("duality-check");
          setLog((prev) => [
            ...prev,
            {
              id: "duality-err",
              stage: "duality-check",
              level: "error",
              message: `[ERROR] ${errMsg}`,
            },
          ]);
          retryButtonRef.current?.focus();
          return;
        }

        const bufferBase64 = data.bufferBase64;
        if (typeof bufferBase64 !== "string") {
          setError("Invalid response from server: missing document data.");
          setProcessingState("error");
          setActiveStage("duality-check");
          setLog((prev) => [
            ...prev,
            {
              id: "invalid-resp",
              stage: "duality-check",
              level: "error",
              message: "[ERROR] Invalid response from server.",
            },
          ]);
          retryButtonRef.current?.focus();
          return;
        }

        const mimeTypeFromServer = data.mimeType as string;
        const originalName = (data.originalName as string) || name;
        const scannerScan = data.scannerReport?.scan;

        let blob: Blob;
        try {
          const binaryString = atob(bufferBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const needsClientRehydrate =
            piiMapForRehydrate &&
            rehydrateMimeType &&
            Object.keys(piiMapForRehydrate.byToken).length > 0;

          if (needsClientRehydrate) {
            const tokenizedBuffer = bytes.buffer.slice(
              bytes.byteOffset,
              bytes.byteOffset + bytes.byteLength
            );
            const rehydratedBuffer = await ClientVault.rehydrateInBrowser(
              tokenizedBuffer,
              rehydrateMimeType,
              piiMapForRehydrate
            );
            const rehydratedBytes = new Uint8Array(rehydratedBuffer);
            blob = new Blob([rehydratedBytes], { type: rehydrateMimeType });
            setLog((prev) => [
              ...prev,
              {
                id: "client-rehydrate",
                stage: "rehydration",
                level: "success",
                message:
                  "[CLIENT] Rehydrated tokens back into original PII in-browser; server only saw tokenized content.",
              },
            ]);
          } else {
            blob = new Blob([bytes], { type: mimeTypeFromServer });
          }
        } catch {
          setError("Invalid response from server: invalid document data.");
          setProcessingState("error");
          setActiveStage("duality-check");
          setLog((prev) => [
            ...prev,
            {
              id: "invalid-resp",
              stage: "duality-check",
              level: "error",
              message: "[ERROR] Invalid response from server.",
            },
          ]);
          retryButtonRef.current?.focus();
          return;
        }

        lastHardenedBlobRef.current = blob;
        lastHardenedPdfBlobRef.current = null;
        lastPdfExportFileNameRef.current = null;
        const pdfB64 = data.pdfExportBase64;
        const pdfFn = data.pdfExportFileName;
        if (
          typeof pdfB64 === "string" &&
          typeof pdfFn === "string" &&
          pdfFn.trim() !== ""
        ) {
          try {
            const pdfBinary = atob(pdfB64);
            const pdfBytes = new Uint8Array(pdfBinary.length);
            for (let i = 0; i < pdfBinary.length; i++) {
              pdfBytes[i] = pdfBinary.charCodeAt(i);
            }
            const pdfMime =
              typeof data.pdfExportMimeType === "string"
                ? data.pdfExportMimeType
                : "application/pdf";
            lastHardenedPdfBlobRef.current = new Blob([pdfBytes], {
              type: pdfMime,
            });
            lastPdfExportFileNameRef.current = pdfFn;
          } catch {
            lastHardenedPdfBlobRef.current = null;
            lastPdfExportFileNameRef.current = null;
          }
        }

        lastHardenedConfigRef.current = {
          payloads: { ...payloadsForEnabled },
          eggIds: [...eggIdsToUse],
          preserveStyles,
          includePdfExport: includePdfExportParam,
        };
        setArmedEggIds(new Set(eggIdsToUse));

        const canaryTokenUsed = data.canaryTokenUsed;
        if (typeof canaryTokenUsed === "string" && canaryTokenUsed.trim() !== "") {
          try {
            const current = canaryWingPayload.trim() ? JSON.parse(canaryWingPayload) as Record<string, unknown> : {};
            const nextCanary = JSON.stringify({ ...current, token: canaryTokenUsed });
            setCanaryWingPayload(nextCanary);
            // Snap was taken from pre-token payloads; align it so haveEggsChanged() does not
            // treat the server-filled token as "user changed settings since last run".
            const snap = lastHardenedConfigRef.current;
            if (snap && Object.prototype.hasOwnProperty.call(snap.payloads, "canary-wing")) {
              lastHardenedConfigRef.current = {
                ...snap,
                payloads: { ...snap.payloads, "canary-wing": nextCanary },
              };
            }
          } catch {
            // leave as-is
          }
        }

        if (scannerScan && typeof scannerScan === "object") {
          setDualityResult({
            hasSuspiciousPatterns: !!scannerScan.hasSuspiciousPatterns,
            matchedPatterns: Array.isArray(scannerScan.matchedPatterns)
              ? scannerScan.matchedPatterns
              : [],
            details: Array.isArray(scannerScan.details) ? scannerScan.details : undefined,
          });
        } else {
          setDualityResult({ hasSuspiciousPatterns: false, matchedPatterns: [] });
        }

        setProcessingState("completed");
        setActiveStage("rehydration");
        const noEggsApplied = eggIdsToUse.length === 0;
        setSuccessMessage(noEggsApplied ? originalName : buildFinalFileName(originalName));
        successMessageRef.current?.focus();
        setLog((prev) => [
          ...prev,
          {
            id: "duality",
            stage: "duality-check",
            level: "info",
            message:
              "[DUALITY] Scanning original CV for existing prompt-injection patterns…",
          },
          {
            id: "dehydrate",
            stage: "dehydration",
            level: "info",
            message:
              "[DEHYDRATE] PII dehydrated into Stateless & Volatile vault tokens (in-memory only; never stored).",
          },
          {
            id: "inject",
            stage: "injection",
            level: "success",
            message: "[INJECT] Funversarial eggs applied to dehydrated document.",
          },
          {
            id: "rehydrate",
            stage: "rehydration",
            level: "success",
            message:
              "[REHYDRATE] PII rehydrated into final CV stream (eggs injected). Stateless & Volatile handling complete; nothing persisted.",
          },
        ]);
      } catch (_err) {
        setError("Network error. Please try again.");
        setProcessingState("error");
        setActiveStage("accept");
        retryButtonRef.current?.focus();
        setLog((prev) => [
          ...prev,
          {
            id: "network-err",
            stage: "accept",
            level: "error",
            message: "[ERROR] Network error.",
          },
        ]);
      }
    },
    [canaryWingPayload, includePdfExport]
  );

  const startPipelineForFile = async (file: File) => {
    const name = file.name;
    if (file.size === 0) {
      setError("Document is empty. Please choose a valid Word document (.docx).");
      setProcessingState("error");
      setActiveStage("accept");
      setLog([
        {
          id: "accept-empty",
          stage: "accept",
          level: "error",
          message: `[ACCEPT] Refusing empty file "${name}".`,
        },
      ]);
      return;
    }
    setError(null);
    setSuccessMessage(null);
    lastHardenedBlobRef.current = null;
    lastHardenedPdfBlobRef.current = null;
    lastPdfExportFileNameRef.current = null;
    lastHardenedConfigRef.current = null;
    setArmedEggIds(new Set());
    setClientPiiMap(null);
    setProcessingState("processing");
    setActiveStage("accept");
    setLog([
      {
        id: "accept",
        stage: "accept",
        level: "info",
        message: `[ACCEPT] Buffer received for "${name}".`,
      },
    ]);

    const payloads = {
      "invisible-hand": invisibleHandPayload,
      "incident-mailto": incidentMailtoPayload,
      "canary-wing": canaryWingPayload,
      "metadata-shadow": metadataShadowPayload,
    };
    const payloadsForEnabled: Record<string, string> = {};
    for (const id of enabledEggIds) {
      if (payloads[id as keyof typeof payloads] !== undefined) {
        payloadsForEnabled[id] = payloads[id as keyof typeof payloads];
      }
    }

    let rehydrateMimeType: string | null = null;
    let piiMapForRehydrate: PiiMap | null = null;
    let fileToSend: File = file;

    // E2E hook: force server-PDF confirmation dialog without calling dehydrateInBrowser (for Playwright).
    if (
      typeof window !== "undefined" &&
      window.location.search.includes("e2eServerPdf=1") &&
      file.type === "application/pdf" &&
      enabledEggIds.size > 0
    ) {
      setLog((prev) => [
        ...prev,
        {
          id: "client-server-only-confirm",
          stage: "dehydration",
          level: "info",
          message:
            "[CLIENT] This PDF and the selected eggs can only be processed by the server. Confirm to continue or uncheck eggs.",
        },
      ]);
      setServerPdfConfirm({
        fileToSend: file,
        name,
        payloadsForEnabled: { ...payloadsForEnabled },
        enabledEggIds: [...enabledEggIds],
        preserveStyles,
      });
      return;
    }

    try {
      const result = await ClientVault.dehydrateInBrowser(file);
      rehydrateMimeType = result.mimeType;
      piiMapForRehydrate = result.piiMap;
      setClientPiiMap(result.piiMap);
      const tokenizedCopy = await ClientTokenReplace.replacePiiWithTokensInCopy(
        file,
        result.piiMap
      );
      if (tokenizedCopy) {
        fileToSend = tokenizedCopy.file;
        setLog((prev) => [
          ...prev,
          {
            id: "client-dehydrate",
            stage: "dehydration",
            level: "info",
            message:
              "[CLIENT] Dehydrated PII in-browser, tokenized copy (layout preserved), sending to server.",
          },
        ]);
      } else {
        const tokenizedDocBuffer = await createDocumentWithTextInBrowser(
          result.tokenizedText,
          result.mimeType
        );
        fileToSend = new File([tokenizedDocBuffer], name, {
          type: result.mimeType,
        });
        setLog((prev) => [
          ...prev,
          {
            id: "client-dehydrate",
            stage: "dehydration",
            level: "info",
            message:
              "[CLIENT] Dehydrated PII in-browser, rebuilt tokenized file, sending to server.",
          },
        ]);
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Client-side dehydration failed. Falling back to server path.";
      const isPdfParseIssue = /defineProperty|non-object|Invalid PDF/i.test(msg);
      const friendly = isPdfParseIssue
        ? "This PDF could not be read in the browser (parser limitation); using server path. Many other PDFs work client-side."
        : msg;
      // Use "info" level for expected fallback (PDF parse issues), "warning" for unexpected errors
      const level = isPdfParseIssue ? "info" : "warning";
      setLog((prev) => [
        ...prev,
        {
          id: "client-dehydrate-fallback",
          stage: "dehydration",
          level,
          message: `[CLIENT] ${friendly}`,
        },
      ]);
      // When PDF and eggs are enabled, require confirmation before sending to server
      if (
        isPdfParseIssue &&
        file.type === "application/pdf" &&
        enabledEggIds.size > 0
      ) {
        setLog((prev) => [
          ...prev,
          {
            id: "client-server-only-confirm",
            stage: "dehydration",
            level: "info",
            message:
              "[CLIENT] This PDF and the selected eggs can only be processed by the server. Confirm to continue or uncheck eggs.",
          },
        ]);
        setServerPdfConfirm({
          fileToSend: file,
          name,
          payloadsForEnabled: { ...payloadsForEnabled },
          enabledEggIds: [...enabledEggIds],
          preserveStyles,
        });
        return;
      }

      // Never POST the original document after dehydration failure (server PII guard would reject; avoids sending raw PII).
      setError(copy.errorDehydrationClientFailed);
      setProcessingState("error");
      setActiveStage("dehydration");
      setLog((prev) => [
        ...prev,
        {
          id: "client-dehydrate-blocked",
          stage: "dehydration",
          level: "error",
          message:
            "[CLIENT] Dehydration failed; refusing to upload original file to the server.",
        },
      ]);
      retryButtonRef.current?.focus();
      return;
    }

    await runSubmitToServer({
      fileToSend,
      name,
      eggIdsToUse: [...enabledEggIds],
      payloadsForEnabled,
      preserveStyles,
      includePdfExport,
      piiMapForRehydrate,
      rehydrateMimeType,
    });
  };

  /** Fetches demo CV from API and arms the file if the buffer is a valid .docx. */
  const loadDemoCv = async (
    variant: "clean" | "dirty",
    format: "pdf" | "docx"
  ): Promise<boolean> => {
    try {
      setError(null);
      setSuccessMessage(null);
      const url = `/api/demo-cv?variant=${variant}&format=${format}`;
      const res = await fetch(url);
      const data = (await res.json().catch(() => null)) as {
        bufferBase64?: unknown;
        mimeType?: unknown;
        originalName?: unknown;
        error?: unknown;
      } | null;

      if (!res.ok) {
        const apiMsg =
          data && typeof data.error === "string" && data.error.trim() !== ""
            ? data.error
            : "Failed to fetch demo CV. Please try again.";
        setError(apiMsg);
        return false;
      }

      if (
        !data ||
        typeof data.bufferBase64 !== "string" ||
        typeof data.mimeType !== "string" ||
        typeof data.originalName !== "string"
      ) {
        setError("Failed to fetch demo CV. Please try again.");
        return false;
      }

      let bytes: Uint8Array;
      try {
        bytes = decodeBase64ToUint8Array(data.bufferBase64);
      } catch {
        setError("Demo CV data could not be decoded. Please try again.");
        return false;
      }

      if (bytes.length === 0) {
        setError("Demo CV document was empty. Please try again.");
        return false;
      }

      const detected = detectDocumentTypeFromUint8Array(bytes);
      if (detected === "pdf") {
        setError(
          "This file looks like a PDF. We currently support Word documents (.docx) only."
        );
        return false;
      }
      if (detected !== "docx") {
        setError(
          "The demo file was not recognized as a Word document. Please try again."
        );
        return false;
      }

      const arrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer;
      const demoFile = new File([arrayBuffer], data.originalName, {
        type: data.mimeType,
      });
      armPipelineWithFile(demoFile);
      return true;
    } catch {
      setError("Failed to fetch demo CV. Please try again.");
      return false;
    }
  };

  const downloadCurrentDemo = useCallback(async () => {
    try {
      const url = `/api/demo-cv?variant=${demoVariant}&format=${demoFormat}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data.bufferBase64 !== "string" || typeof data.mimeType !== "string" || typeof data.originalName !== "string") {
        setError("Failed to download demo CV. Please try again.");
        return;
      }
      let bytes: Uint8Array;
      try {
        bytes = decodeBase64ToUint8Array(data.bufferBase64);
      } catch {
        setError("Failed to download demo CV. Please try again.");
        return;
      }
      if (bytes.length === 0) {
        setError("Demo CV document was empty. Please try again.");
        return;
      }
      const arrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: data.mimeType });
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObj;
      a.download = data.originalName;
      a.click();
      URL.revokeObjectURL(urlObj);
    } catch {
      setError("Failed to download demo CV. Please try again.");
    }
  }, [demoFormat, demoVariant]);

  const loadPreset = async (variant: "clean" | "dirty", format: "pdf" | "docx") => {
    setIsDemoLoading(true);
    try {
      const ok = await loadDemoCv(variant, format);
      if (!ok) return;
      setDemoVariant(variant);
      setDemoFormat(format);
      setHasDemoLoaded(true);
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <>
      {serverPdfConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="server-pdf-confirm-title"
          aria-describedby="server-pdf-confirm-desc"
        >
          <Card className="w-full max-w-md border-accent/50 bg-panel p-5 shadow-lg">
            <h2 id="server-pdf-confirm-title" className="mb-2 text-base font-semibold text-accent">
              {copy.serverPdfConfirmTitle}
            </h2>
            <p id="server-pdf-confirm-desc" className="mb-4 text-sm text-foreground/80">
              {copy.serverPdfConfirmDesc}
            </p>
            <p className="mb-3 text-caption text-foreground/60">
              {copy.serverPdfConfirmEggsLabel}{" "}
              <span className="font-mono text-accent/90">
                {serverPdfConfirm.enabledEggIds
                  .map((id) => eggMetadataById[id]?.name ?? EGG_OPTIONS.find((o) => o.id === id)?.name ?? id)
                  .join(", ")}
              </span>
            </p>
            <p className="mb-4 text-caption text-foreground/50">
              {copy.serverPdfConfirmNote}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  const conf = serverPdfConfirm;
                  setServerPdfConfirm(null);
                  void runSubmitToServer({
                    fileToSend: conf.fileToSend,
                    name: conf.name,
                    eggIdsToUse: conf.enabledEggIds,
                    payloadsForEnabled: conf.payloadsForEnabled,
                    preserveStyles: conf.preserveStyles,
                    includePdfExport,
                    piiMapForRehydrate: null,
                    rehydrateMimeType: null,
                  });
                }}
              >
                {copy.serverPdfConfirmContinue}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const conf = serverPdfConfirm;
                  userHasChangedCheckboxesRef.current = true;
                  setEnabledEggIds(new Set());
                  setServerPdfConfirm(null);
                  void runSubmitToServer({
                    fileToSend: conf.fileToSend,
                    name: conf.name,
                    eggIdsToUse: [],
                    payloadsForEnabled: {},
                    preserveStyles: conf.preserveStyles,
                    includePdfExport,
                    piiMapForRehydrate: null,
                    rehydrateMimeType: null,
                  });
                }}
              >
                {copy.serverPdfConfirmUncheckContinue}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setServerPdfConfirm(null);
                  setProcessingState("idle");
                }}
              >
                {copy.serverPdfConfirmCancel}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <main id="main-content" className="min-h-dvh-screen bg-bg text-foreground">
        <div className="mx-auto flex min-h-dvh-screen min-w-0 max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-8 md:py-10">
        <SiteTopBar />

        <AudienceCopyFadeShell className="flex min-w-0 flex-1 flex-col">
        <SiteHeader
          secondaryNav={{ href: "/resources", label: copy.resourcesLink }}
          taglineClassName={
            taglineAttentionActive
              ? `${ATTENTION_PULSE_CLASS} rounded-md inline-block`
              : undefined
          }
        />

        <section className="flex flex-1 flex-col gap-8 md:flex-row">
          <div className="flex-1">
            {copy.introLead.trim() ? (
              <div className="mb-6">{renderIntro(copy.introLead)}</div>
            ) : null}
            <div className="functional-group mb-6 overflow-hidden">
              <CollapsibleCard
                className="rounded-none border-0 bg-transparent shadow-none"
                title={copy.experimentFlowCollapsibleTitle}
                titleId="experiment-flow-card-title"
                contentId="experiment-flow-card-content"
                ariaLabel={`${copy.experimentFlowCollapsibleTitle}: show or hide steps`}
                defaultExpanded={false}
                expandOnWide
              >
                <ExperimentFlowPanelBody copy={copy} showPositioningLine />
              </CollapsibleCard>
            </div>

            <div ref={inputChannelSectionRef} className="min-w-0">
            <SectionFold
              ref={inputChannelTriggerRef}
              className="functional-group"
              title={copy.inputChannel}
              titleId="input-channel-section-title"
              contentId="input-channel-section-content"
              ariaLabel={`${copy.inputChannel}: show or hide`}
              defaultExpanded
            >
              <DropZone onFileSelect={onFileSelect} maxSizeBytes={MAX_FILE_SIZE_BYTES} openFilePickerRef={openFilePickerRef} />
              <p className="mt-1 text-caption text-foreground/50">
                {copy.maxFileHint}
              </p>
              <CollapsibleCard
                className="mt-3"
                title={copy.sampleCvTitle}
                titleId="sample-cv-preset-title"
                contentId="sample-cv-preset-content"
                ariaLabel={copy.sampleCvAriaLabel}
                defaultExpanded={false}
              >
                <div className="space-y-3 text-caption text-foreground/60">
                  <p className="text-caption text-foreground/60">
                    {copy.sampleCvDescription.split(/\b(Clean|Dirty)\b/).map((segment, i) =>
                      segment === "Clean" ? (
                        <span key={i} className="text-accent font-mono">Clean</span>
                      ) : segment === "Dirty" ? (
                        <span key={i} className="text-success font-mono">Dirty</span>
                      ) : (
                        <span key={i}>{segment}</span>
                      )
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[36px] px-3 py-2 text-caption sm:text-xs border border-accent/30 bg-panel text-foreground hover:border-accent/60 hover:shadow-accent/40 flex flex-col items-start"
                      disabled={isDemoLoading}
                      onClick={() => loadPreset("clean", "docx")}
                    >
                      <span className="font-mono text-accent">{copy.cleanLabel}</span>
                      <span className="text-xs text-foreground/60">
                        {copy.cleanSublabel}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[36px] px-3 py-2 text-caption sm:text-xs border border-amber-300/70 border-dashed bg-panel text-foreground hover:border-amber-400/80 flex flex-col items-start"
                      disabled={isDemoLoading}
                      onClick={() => loadPreset("dirty", "docx")}
                    >
                      <span className="font-mono text-success">{copy.dirtyLabel}</span>
                      <span className="text-xs text-foreground/60">
                        {copy.dirtySublabel}
                      </span>
                    </Button>
                  </div>
                  {isDemoLoading && (
                    <p
                      className="text-caption text-accent/80 font-mono"
                      aria-live="polite"
                    >
                      {copy.demoLoadingMessage}
                    </p>
                  )}
                  <p className="text-caption text-foreground/60">
                    {copy.lastPresetLabel}{" "}
                    <span className="font-mono text-success">
                      {demoVariant === "clean" ? "clean" : "dirty"} ·{" "}
                      {demoFormat.toUpperCase()}
                    </span>
                  </p>
                  {hasDemoLoaded && selectedFileName ? (
                    <p
                      className="text-caption text-success font-mono mt-2"
                      role="status"
                      aria-live="polite"
                    >
                      {copy.demoArmedInlineHint}
                    </p>
                  ) : null}
                </div>
              </CollapsibleCard>
            </SectionFold>
            </div>

            {contentAudience === "security" && copy.introDetail.trim() ? (
              <div className="mb-6">{renderIntro(copy.introDetail)}</div>
            ) : null}

            <CollapsibleCard
              className="mb-6 border-border/60 bg-panel/40"
              title={copy.privacyDetailsSummary}
              titleClassName="text-caption sm:text-xs font-medium text-accent normal-case"
              titleId="privacy-details-card-title"
              contentId="privacy-details-card-content"
              ariaLabel={`${copy.privacyDetailsSummary}: show or hide details`}
              defaultExpanded={false}
            >
              <PiiNoticeBlock copy={copy} audience={contentAudience} />
            </CollapsibleCard>

            <SectionFold
              ref={engineSectionTriggerRef}
              className="functional-group mt-6"
              title={copy.engineConfigTitle}
              titleId="engine-config-section-title"
              contentId="engine-config-section-content"
              ariaLabel={`${copy.engineConfigTitle}: show or hide`}
              defaultExpanded={false}
              expandRevision={engineFoldExpandSignal}
            >
            <p className="mb-3 text-caption text-foreground/60">
              {selectedFileName
                ? copy.engineConfigIntroCvReady
                : copy.engineConfigIntroNoCv}
            </p>
            {selectedFileName && (
              <div ref={armedSectionRef}>
                <p className="mt-0 text-sm text-success">
                  {copy.armedCvLabel} <span className="font-semibold">{selectedFileName}</span>
                </p>
                <div className="mt-1 flex flex-col items-start gap-1">
                  <button
                    type="button"
                    className={`px-0 text-caption underline underline-offset-2 ${
                      hasDemoLoaded
                        ? "text-accent hover:text-success"
                        : "text-foreground/40 cursor-not-allowed"
                    }`}
                    onClick={hasDemoLoaded ? downloadCurrentDemo : undefined}
                    disabled={!hasDemoLoaded}
                  >
                    {hasDemoLoaded ? copy.downloadDemoLabel : copy.selectDemoLabel}
                  </button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      clearFile();
                      openFilePickerRef.current?.();
                    }}
                    className="min-h-[44px] py-2 px-3 text-caption sm:text-xs"
                    aria-label={copy.changeFileButton}
                  >
                    {copy.changeFileButton}
                  </Button>
                </div>
                <p className="mt-4 border-b border-border/60 pb-2 text-caption font-medium uppercase tracking-[0.2em] text-foreground/70">
                  {copy.eggsToRunTitle}
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {EGG_OPTIONS.map((egg) => {
                    const title =
                      egg.id === "invisible-hand"
                        ? copy.eggInvisibleHandTitle
                        : egg.id === "incident-mailto"
                          ? copy.eggIncidentMailtoTitle
                          : egg.id === "canary-wing"
                            ? copy.eggCanaryWingTitle
                            : copy.eggMetadataShadowTitle;
                    const subtitle =
                      egg.id === "invisible-hand" || egg.id === "canary-wing"
                        ? copy.styleAffecting
                        : copy.styleSafe;
                    const enabled = enabledEggIds.has(egg.id);
                    const expanded = eggRowExpanded[egg.id] ?? false;
                    return (
                      <EggConfiguratorRow
                        key={egg.id}
                        eggDomId={egg.id}
                        enabled={enabled}
                        onEnabledChange={(on) => setEggEnabled(egg.id, on)}
                        title={title}
                        subtitle={subtitle}
                        expanded={expanded}
                        onExpandedChange={(next) =>
                          setEggRowExpanded((prev) => ({
                            ...prev,
                            [egg.id]: next,
                          }))
                        }
                        expandAriaLabel={`Expand configuration: ${title}`}
                      >
                        {egg.id === "invisible-hand" ? (
                          <InvisibleHandConfigBody
                            payload={invisibleHandPayload}
                            onPayloadChange={setInvisibleHandPayload}
                            disabled={!enabled}
                            manualCheckAndValidation={
                              eggMetadataById["invisible-hand"]
                                ?.manualCheckAndValidation
                            }
                          />
                        ) : egg.id === "incident-mailto" ? (
                          <IncidentMailtoConfigBody
                            payload={incidentMailtoPayload}
                            onPayloadChange={setIncidentMailtoPayload}
                            disabled={!enabled}
                            manualCheckAndValidation={
                              eggMetadataById["incident-mailto"]
                                ?.manualCheckAndValidation
                            }
                          />
                        ) : egg.id === "canary-wing" ? (
                          <CanaryWingConfigBody
                            payload={canaryWingPayload}
                            onPayloadChange={setCanaryWingPayload}
                            disabled={!enabled}
                            manualCheckAndValidation={
                              eggMetadataById["canary-wing"]
                                ?.manualCheckAndValidation
                            }
                          />
                        ) : (
                          <MetadataShadowConfigBody
                            payload={metadataShadowPayload}
                            onPayloadChange={setMetadataShadowPayload}
                            disabled={!enabled}
                            manualCheckAndValidation={
                              eggMetadataById["metadata-shadow"]
                                ?.manualCheckAndValidation
                            }
                          />
                        )}
                      </EggConfiguratorRow>
                    );
                  })}
                </div>
                <p className="mt-6 border-b border-border/60 pb-2 text-caption font-medium uppercase tracking-[0.2em] text-foreground/70">
                  {copy.engineOutputSectionTitle}
                </p>
                <p className="mt-2 text-caption text-foreground/50">
                  {copy.outputPlainTextHint}
                </p>
                <div className="mt-2 rounded-md border border-border/50 bg-panel/40 px-3 py-2.5">
                  <div className="flex min-h-[44px] items-center gap-3">
                    <input
                      id="preserve-styles-checkbox"
                      type="checkbox"
                      checked={preserveStyles}
                      onChange={() => {
                        userHasChangedCheckboxesRef.current = true;
                        setPreserveStyles((p) => !p);
                      }}
                      className="h-4 w-4 shrink-0 rounded border-border text-accent focus:ring-accent/50"
                      aria-describedby={
                        preserveStylesDetailExpanded
                          ? "preserve-styles-summary preserve-styles-desc"
                          : "preserve-styles-summary"
                      }
                    />
                    <label
                      htmlFor="preserve-styles-checkbox"
                      className="min-w-0 flex-1 cursor-pointer text-sm font-medium leading-snug text-foreground/90"
                    >
                      {copy.preserveStylesLabel}
                    </label>
                  </div>
                  <div className="mt-2 min-w-0 pl-7">
                    <p
                      id="preserve-styles-summary"
                      className="text-caption leading-relaxed text-foreground/75 sm:text-xs"
                    >
                      {copy.preserveStylesSummary}{" "}
                      <button
                        type="button"
                        onClick={() =>
                          setPreserveStylesDetailExpanded((e) => !e)
                        }
                        aria-expanded={preserveStylesDetailExpanded}
                        aria-controls="preserve-styles-desc"
                        id="preserve-styles-detail-trigger"
                        className="text-accent underline underline-offset-2 hover:text-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg rounded"
                      >
                        {copy.preserveStylesDetailAnchor}
                        <span aria-hidden="true" className="ml-0.5">
                          {preserveStylesDetailExpanded ? " ▼" : " ▸"}
                        </span>
                      </button>
                    </p>
                    <div
                      id="preserve-styles-desc"
                      role="region"
                      aria-labelledby="preserve-styles-detail-trigger"
                      className={
                        preserveStylesDetailExpanded
                          ? "mt-1.5 border-l-2 border-accent/40 pl-3 text-caption leading-relaxed text-foreground/80 sm:text-xs"
                          : "hidden"
                      }
                    >
                      {copy.preserveStylesDesc}
                    </div>
                  </div>
                </div>
                <div className="hidden">
                <div className="mt-2 rounded-md border border-border/50 bg-panel/40 px-3 py-2.5">
                  <div className="flex min-h-[44px] items-start gap-3">
                    <input
                      id="include-pdf-export-checkbox"
                      type="checkbox"
                      checked={includePdfExport}
                      onChange={() => {
                        userHasChangedCheckboxesRef.current = true;
                        setIncludePdfExport((p) => !p);
                      }}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-border text-accent focus:ring-accent/50"
                      aria-describedby={
                        includePdfExportDetailExpanded
                          ? "include-pdf-export-summary include-pdf-export-desc"
                          : "include-pdf-export-summary"
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor="include-pdf-export-checkbox"
                        className="cursor-pointer text-sm font-medium leading-snug text-foreground/90"
                      >
                        {copy.includePdfExportLabel}
                      </label>
                      <p
                        id="include-pdf-export-summary"
                        className="mt-1 text-caption leading-relaxed text-foreground/75 sm:text-xs"
                      >
                        {copy.includePdfExportSummary}{" "}
                        <button
                          type="button"
                          onClick={() =>
                            setIncludePdfExportDetailExpanded((e) => !e)
                          }
                          aria-expanded={includePdfExportDetailExpanded}
                          aria-controls="include-pdf-export-desc"
                          id="include-pdf-export-detail-trigger"
                          className="text-accent underline underline-offset-2 hover:text-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg rounded"
                        >
                          {copy.includePdfExportDetailAnchor}
                          <span aria-hidden="true" className="ml-0.5">
                            {includePdfExportDetailExpanded ? " ▼" : " ▸"}
                          </span>
                        </button>
                      </p>
                      <div
                        id="include-pdf-export-desc"
                        role="region"
                        aria-labelledby="include-pdf-export-detail-trigger"
                        className={
                          includePdfExportDetailExpanded
                            ? "mt-1.5 border-l-2 border-accent/40 pl-3 text-caption leading-relaxed text-foreground/80 sm:text-xs"
                            : "hidden"
                        }
                      >
                        {copy.includePdfExportDetailDesc}
                      </div>
                    </div>
                  </div>
                </div>
                </div>
                <Button
                  onClick={runHarden}
                  disabled={pipelineHardenDisabled}
                  aria-label={pipelineHardenAria}
                  className="mt-4 w-full flex items-center justify-center gap-2"
                >
                  {processingState === "processing" && (
                    <span className="flex items-end gap-0.5 h-4" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          className="music-loading-bar w-0.5 h-3 bg-accent rounded-full origin-bottom"
                        />
                      ))}
                    </span>
                  )}
                  {processingState === "processing" ? copy.hardenProcessing : copy.hardenButton}
                </Button>
              </div>
            )}
            {successMessage && (
              <div className="mt-2" role="status" aria-live="polite">
                <p
                  ref={successMessageRef}
                  tabIndex={-1}
                  className="text-sm text-success"
                >
                  {lastHardenedConfigRef.current?.eggIds?.length === 0
                    ? copy.successScanComplete
                    : copy.successHardenedReady}{" "}
                  <span className="font-mono">{successMessage}</span>
                </p>
                {downloadReflectsStaleConfig ? (
                  <p
                    id="download-stale-hint"
                    className="mt-2 max-w-prose text-sm text-warning border-l-2 border-warning/70 pl-3"
                  >
                    {copy.downloadStaleConfigWarning}
                  </p>
                ) : null}
                <div
                  data-testid="download-hardened-actions"
                  className={
                    downloadSuccessHasInjectedEggs
                      ? "mt-3 w-full flex flex-col items-center gap-2"
                      : "mt-1 flex flex-wrap gap-2"
                  }
                >
                  <Button
                    variant="primary"
                    onClick={triggerDownload}
                    className={
                      downloadSuccessHasInjectedEggs
                        ? `w-full max-w-sm !min-h-[48px] px-6 py-3 text-base ${ATTENTION_PULSE_CLASS}`
                        : "min-h-[44px] py-2"
                    }
                    data-testid="download-hardened-docx"
                    aria-label={`${copy.downloadButton} ${successMessage}`}
                    aria-describedby={
                      downloadReflectsStaleConfig ? "download-stale-hint" : undefined
                    }
                  >
                    {copy.downloadButton}
                  </Button>
                  {successMessage && lastHardenedPdfBlobRef.current ? (
                    <Button
                      variant="secondary"
                      onClick={triggerPdfDownload}
                      className={
                        downloadSuccessHasInjectedEggs
                          ? "w-full max-w-sm min-h-[44px] py-2"
                          : "min-h-[44px] py-2"
                      }
                      data-testid="download-pdf-export"
                      aria-label={`${copy.downloadPdfButton} ${lastPdfExportFileNameRef.current ?? ""}`}
                      aria-describedby={
                        downloadReflectsStaleConfig ? "download-stale-hint" : undefined
                      }
                    >
                      {copy.downloadPdfButton}
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
            {error && (
              <div ref={errorRef} className="mt-2" role="alert">
                <p className="text-sm text-error">
                  {copy.errorAlertPrefix} {error}
                </p>
                <Button
                  ref={retryButtonRef}
                  variant="secondary"
                  onClick={runHarden}
                  className="mt-1 text-sm px-2 py-1 min-h-[44px]"
                  aria-label={copy.retryAria}
                >
                  {copy.retryButton}
                </Button>
              </div>
            )}
            </SectionFold>

            <SectionFold
              ref={validationLabTriggerRef}
              sectionId="validation-lab"
              className="functional-group mt-6"
              title={copy.validationLabTitle}
              titleId="validation-lab-section-title"
              contentId="validation-lab-section-content"
              ariaLabel={copy.validationLabCollapsibleAriaLabel}
              defaultExpanded={false}
            >
              <ValidationLab
                armedEggIds={armedEggIds}
                onPromptCopy={(id) =>
                  setLog((prev) => [
                    ...prev,
                    {
                      id: `validation-copy-${id}-${crypto.randomUUID()}`,
                      stage: "accept",
                      level: "success",
                      message: copy.validationCopySuccessLogMessage.replace("{id}", id),
                    },
                  ])
                }
                onSampleJdCopy={() =>
                  setLog((prev) => [
                    ...prev,
                    {
                      id: `validation-copy-jd-${crypto.randomUUID()}`,
                      stage: "accept",
                      level: "success",
                      message: copy.validationJdCopySuccessLogMessage,
                    },
                  ])
                }
              />
            </SectionFold>
          </div>

          <aside className="mt-8 w-full md:mt-0 md:w-80 md:shrink-0 md:sticky md:top-6 md:self-start md:max-h-[calc(100vh-3rem)] md:overflow-y-auto">
            <SectionFold
              className="functional-group"
              title={copy.pipelineStatusTitle}
              titleId="pipeline-status-section-title"
              contentId="pipeline-status-section-content"
              ariaLabel={`${copy.pipelineStatusTitle}: show or hide`}
              defaultExpanded
            >
              <div className="max-h-[60vh] overflow-y-auto md:max-h-none">
                <DualityMonitor
                  processingState={processingState}
                  activeStage={activeStage}
                  log={log}
                  dualityResult={dualityResult ?? undefined}
                />
              </div>
            </SectionFold>
          </aside>
        </section>
        </AudienceCopyFadeShell>
      </div>
      </main>
    </>
  );
}
