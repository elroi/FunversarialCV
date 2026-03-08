/**
 * API route tests for GET /api/eggs (TDD).
 * Asserts: 200, body.eggs array, each egg has id, name, manualCheckAndValidation (non-empty).
 * @jest-environment node
 */

import { GET } from "./route";

describe("GET /api/eggs", () => {
  it("returns 200 with eggs array", async () => {
    const req = new Request("http://localhost:3000/api/eggs", { method: "GET" });
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("eggs");
    expect(Array.isArray(data.eggs)).toBe(true);
  });

  it("returns each egg with id, name, and manualCheckAndValidation", async () => {
    const req = new Request("http://localhost:3000/api/eggs", { method: "GET" });
    const res = await GET(req as never);
    const data = await res.json();
    const ids = new Set(data.eggs.map((e: { id: string }) => e.id));
    expect(ids).toContain("invisible-hand");
    expect(ids).toContain("incident-mailto");
    expect(ids).toContain("canary-wing");
    expect(ids).toContain("metadata-shadow");

    for (const egg of data.eggs) {
      expect(egg).toHaveProperty("id");
      expect(egg).toHaveProperty("name");
      expect(egg).toHaveProperty("manualCheckAndValidation");
      expect(typeof egg.manualCheckAndValidation).toBe("string");
      expect(egg.manualCheckAndValidation.length).toBeGreaterThan(20);
    }
  });
});
