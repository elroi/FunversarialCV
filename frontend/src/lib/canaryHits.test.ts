/**
 * TDD for Canary Wing hit persistence.
 * Verifies that persistCanaryHit stores normalized hits and getRecentCanaryHits returns them newest-first.
 */

import { persistCanaryHit, getRecentCanaryHits, getCanaryHitsByToken, __resetCanaryHitsForTests } from "./canaryHits";

describe("canaryHits persistence", () => {
  beforeEach(() => {
    __resetCanaryHitsForTests();
  });

  it("stores hits and returns them from getRecentCanaryHits newest-first", async () => {
    const firstTs = "2026-03-09T10:00:00.000Z";
    const secondTs = "2026-03-09T10:01:00.000Z";

    await persistCanaryHit({
      tokenId: "uuid-1",
      variant: "pdf-text",
      ts: firstTs,
      userAgent: "agent-1",
    });
    await persistCanaryHit({
      tokenId: "uuid-2",
      variant: "docx-hidden",
      ts: secondTs,
      referer: "https://example.com",
    });

    const hits = getRecentCanaryHits();
    expect(hits.length).toBe(2);
    // Newest first
    expect(hits[0]).toMatchObject({
      tokenId: "uuid-2",
      variant: "docx-hidden",
      ts: secondTs,
      referer: "https://example.com",
    });
    expect(hits[1]).toMatchObject({
      tokenId: "uuid-1",
      variant: "pdf-text",
      ts: firstTs,
      userAgent: "agent-1",
    });
  });

  it("getCanaryHitsByToken returns only hits for the given token, newest-first", async () => {
    await persistCanaryHit({ tokenId: "a", variant: "v1", ts: "2026-03-09T10:00:00.000Z" });
    await persistCanaryHit({ tokenId: "b", variant: "v2", ts: "2026-03-09T10:01:00.000Z" });
    await persistCanaryHit({ tokenId: "a", variant: "v3", ts: "2026-03-09T10:02:00.000Z" });
    const forA = getCanaryHitsByToken("a");
    expect(forA).toHaveLength(2);
    expect(forA[0].variant).toBe("v3");
    expect(forA[1].variant).toBe("v1");
    const forB = getCanaryHitsByToken("b");
    expect(forB).toHaveLength(1);
    expect(forB[0].variant).toBe("v2");
    expect(getCanaryHitsByToken("c")).toEqual([]);
    expect(getCanaryHitsByToken("")).toEqual([]);
  });

  it("enforces an upper bound on stored hits so memory use stays bounded", async () => {
    const max = 200;
    // Create more than max hits; only last `max` should be retained.
    for (let i = 0; i < max + 10; i++) {
      await persistCanaryHit({
        tokenId: `uuid-${i}`,
        variant: "pdf-text",
        ts: `2026-03-09T10:${String(i).padStart(2, "0")}:00.000Z`,
      });
    }
    const hits = getRecentCanaryHits();
    expect(hits.length).toBe(max);
    // Newest hit should be the last one we inserted.
    expect(hits[0].tokenId).toBe(`uuid-${max + 9}`);
    // Oldest retained hit should be the (max+10-max)th insert.
    expect(hits[hits.length - 1].tokenId).toBe(`uuid-10`);
  });
});

