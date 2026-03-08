/**
 * Eggs metadata API: GET /api/eggs
 * Returns id, name, and manualCheckAndValidation for each egg (client-safe; no transform/validatePayload).
 */

import { NextRequest } from "next/server";
import { AVAILABLE_EGGS } from "@/eggs/registry";

export async function GET(_request: NextRequest) {
  const eggs = AVAILABLE_EGGS.map((e) => ({
    id: e.id,
    name: e.name,
    manualCheckAndValidation: e.manualCheckAndValidation,
  }));
  return Response.json({ eggs });
}
