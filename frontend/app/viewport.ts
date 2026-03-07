import type { Viewport } from "next";

/**
 * Explicit viewport for mobile: device-width, initialScale=1, viewport-fit=cover for notched devices.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
