/**
 * GET /api/lab/config — capability flags and harness metadata only (no secrets, no infra URLs).
 */

import { buildLabConfigResponse } from "@/lib/lab/labConfig";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(buildLabConfigResponse());
}
