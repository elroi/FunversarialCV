/**
 * Client-safe egg metadata (id + name only).
 * Use this in client components (e.g. page) to avoid pulling in egg implementations
 * and their Node-only dependencies (documentExtract → word-extractor → fs).
 * Server-side code should use AVAILABLE_EGGS from registry.ts.
 */

export const EGG_OPTIONS = [
  { id: "invisible-hand", name: "Invisible Hand" },
  { id: "incident-mailto", name: "Incident Mailto" },
  { id: "canary-wing", name: "Canary Wing" },
  { id: "metadata-shadow", name: "Metadata Shadow" },
] as const;

export const DEFAULT_ENABLED_EGG_IDS = new Set(EGG_OPTIONS.map((o) => o.id));
