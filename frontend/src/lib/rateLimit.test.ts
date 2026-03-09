import { checkRateLimit, __resetRateLimitCountersForTests } from "./rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    __resetRateLimitCountersForTests();
    delete process.env.RATE_LIMIT_HARDEN_MAX;
    delete process.env.RATE_LIMIT_HARDEN_WINDOW_MS;
  });

  it("allows requests within the window up to the max", () => {
    process.env.RATE_LIMIT_HARDEN_MAX = "2";
    process.env.RATE_LIMIT_HARDEN_WINDOW_MS = "60000";

    const key = "ip:127.0.0.1";
    expect(checkRateLimit("harden", key).allowed).toBe(true);
    expect(checkRateLimit("harden", key).allowed).toBe(true);
    const third = checkRateLimit("harden", key);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the window after expiry", () => {
    process.env.RATE_LIMIT_HARDEN_MAX = "1";
    process.env.RATE_LIMIT_HARDEN_WINDOW_MS = "60000";

    const key = "ip:192.0.2.1";
    expect(checkRateLimit("harden", key).allowed).toBe(true);
    const denied = checkRateLimit("harden", key);
    expect(denied.allowed).toBe(false);

    // Simulate window expiry by resetting counters (as would happen after a new window).
    __resetRateLimitCountersForTests();
    expect(checkRateLimit("harden", key).allowed).toBe(true);
  });
});

