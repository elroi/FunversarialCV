"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Audience = "security" | "hr";

const STORAGE_KEY = "funversarialcv-audience";

function readStored(): Audience {
  if (typeof window === "undefined") return "security";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "security" || raw === "hr") return raw;
  } catch {
    // ignore
  }
  return "security";
}

interface AudienceContextValue {
  audience: Audience;
  setAudience: (next: Audience) => void;
}

const AudienceContext = createContext<AudienceContextValue | null>(null);

export function AudienceProvider({ children }: { children: React.ReactNode }) {
  const [audience, setAudienceState] = useState<Audience>("security");
  const [mounted, setMounted] = useState(false);

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
    document.documentElement.setAttribute("data-audience", audience);
    return () => {
      document.documentElement.removeAttribute("data-audience");
    };
  }, [mounted, audience]);

  const value = useMemo(
    () => ({ audience: mounted ? audience : "security", setAudience }),
    [audience, setAudience, mounted]
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
