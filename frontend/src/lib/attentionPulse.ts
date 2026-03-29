/**
 * Shared class for the accent box-shadow pulse (see globals.css @keyframes attention-pulse).
 * Security: purely presentational; no user data.
 */
export const ATTENTION_PULSE_CLASS = "attention-pulse";

/** True when the user prefers reduced motion (SSR-safe: false). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Re-runs a one-shot CSS animation on `element` by removing and re-adding the class (reflow).
 * No-op when element is null or when reduced motion is requested.
 */
export function restartAttentionPulse(
  element: HTMLElement | null,
  className: string = ATTENTION_PULSE_CLASS
): void {
  if (!element || prefersReducedMotion()) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}
