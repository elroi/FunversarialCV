/**
 * Reads `--theme-transition-duration` from the document root (see `app/globals.css`).
 * Fallback matches the default `1.5s` when the variable is missing (e.g. Jest without full CSS).
 */
export function getThemeTransitionMs(): number {
  if (typeof document === "undefined") return 1500;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--theme-transition-duration")
    .trim();
  if (!raw) return 1500;
  const sMatch = /^([\d.]+)s$/i.exec(raw);
  if (sMatch) return Math.round(parseFloat(sMatch[1]) * 1000);
  const msMatch = /^([\d.]+)ms$/i.exec(raw);
  if (msMatch) return Math.round(parseFloat(msMatch[1]));
  return 1500;
}
