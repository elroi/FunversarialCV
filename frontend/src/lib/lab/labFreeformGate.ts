/**
 * SECURITY: Freeform model IDs let callers target arbitrary provider model strings (cost, abuse,
 * unexpected capabilities). A single mis-set env var must not enable this on an internet-exposed deploy.
 *
 * Requires all of:
 * - `LAB_FREEFORM_BUILD=1` (explicit deploy intent)
 * - `LAB_MODEL_INPUT=freeform`
 * - `LAB_FREEFORM_MODEL_ACK=I_ACCEPT_ABUSE_RISK`
 *
 * When active, `/api/lab/complete` logs a structured warn (no model id in logs).
 */
export function isLabFreeformModelInputAllowed(): boolean {
  return (
    process.env.LAB_FREEFORM_BUILD === "1" &&
    process.env.LAB_MODEL_INPUT === "freeform" &&
    process.env.LAB_FREEFORM_MODEL_ACK === "I_ACCEPT_ABUSE_RISK"
  );
}
