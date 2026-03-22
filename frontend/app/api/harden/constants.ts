/**
 * Shared constants for POST /api/harden (egg injection).
 * Used by the route (body limit) and tests.
 */

/** Max request body size (file) — 4 MB.
 * Kept below Vercel Serverless Function request limit (~4.5 MB) so oversized
 * uploads fail in-app with a clear 413 rather than a platform error.
 */
export const MAX_BODY_BYTES = 4 * 1024 * 1024;
