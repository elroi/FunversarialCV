/**
 * Shared constants for the harden API.
 * Used by the route (body limit) and tests.
 */

/** Max request body size (file) — 10 MB. Enforced in-route; App Router has no built-in body limit. */
export const MAX_BODY_BYTES = 10 * 1024 * 1024;
