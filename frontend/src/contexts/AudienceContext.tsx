"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getThemeTransitionMs } from "../lib/themeTransitionMs";

export type Audience = "security" | "hr";

/** Drives {@link AudienceCopyFadeShell} opacity; copy swaps only in `between`. */
export type CopyFadePhase = "idle" | "fadeOut" | "between" | "fadeIn";

const STORAGE_KEY = "funversarialcv-audience";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readStored(): Audience {
  if (typeof window === "undefined") return "hr";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "security" || raw === "hr") return raw;
  } catch {
    // ignore
  }
  return "hr";
}

interface AudienceContextValue {
  /** Selected audience (switcher, storage) — updates immediately on click. */
  audience: Audience;
  /**
   * Applied audience: drives `data-audience` / theme, {@link useCopy}, and main copy UI.
   * Updates only after the copy shell has faded out (see sequence: fade → theme → fade in).
   */
  contentAudience: Audience;
  copyFadePhase: CopyFadePhase;
  setAudience: (next: Audience) => void;
}

const AudienceContext = createContext<AudienceContextValue | null>(null);

export function AudienceProvider({ children }: { children: React.ReactNode }) {
  const [audience, setAudienceState] = useState<Audience>("hr");
  const [contentAudience, setContentAudience] = useState<Audience>("hr");
  const [copyFadePhase, setCopyFadePhase] = useState<CopyFadePhase>("idle");
  const [mounted, setMounted] = useState(false);

  const contentAudienceRef = useRef(contentAudience);
  contentAudienceRef.current = contentAudience;

  const hasSyncedAfterMount = useRef(false);

  useEffect(() => {
    setMounted(true);
    setAudienceState(readStored());
  }, []);

  const setAudience = useCallback((next: Audience) => {
    setAudienceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-audience", contentAudience);
  }, [mounted, contentAudience]);

  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute("data-audience");
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!hasSyncedAfterMount.current) {
      hasSyncedAfterMount.current = true;
      setContentAudience(audience);
      contentAudienceRef.current = audience;
      setCopyFadePhase("idle");
      return;
    }

    const reducedMotion = prefersReducedMotion();

    if (reducedMotion) {
      setContentAudience(audience);
      contentAudienceRef.current = audience;
      setCopyFadePhase("idle");
      return;
    }

    if (audience === contentAudienceRef.current) {
      return;
    }

    const target = audience;
    const fadeMs = getThemeTransitionMs();
    setCopyFadePhase("fadeOut");

    const t1 = window.setTimeout(() => {
      setContentAudience(target);
      contentAudienceRef.current = target;
      setCopyFadePhase("between");
    }, fadeMs);

    const t2 = window.setTimeout(() => {
      setCopyFadePhase("fadeIn");
    }, fadeMs + 24);

    const t3 = window.setTimeout(() => {
      setCopyFadePhase("idle");
    }, fadeMs * 2 + 48);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [audience, mounted]);

  const value = useMemo(
    () => ({
      audience: mounted ? audience : "hr",
      contentAudience: mounted ? contentAudience : "hr",
      copyFadePhase,
      setAudience,
    }),
    [audience, contentAudience, copyFadePhase, mounted, setAudience]
  );

  return (
    <AudienceContext.Provider value={value}>
      {children}
    </AudienceContext.Provider>
  );
}

export function useAudience(): AudienceContextValue {
  const ctx = useContext(AudienceContext);
  if (!ctx) {
    throw new Error("useAudience must be used within AudienceProvider");
  }
  return ctx;
}
