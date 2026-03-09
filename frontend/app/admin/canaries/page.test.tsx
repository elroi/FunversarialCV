import React from "react";
import { render, screen } from "@testing-library/react";
import CanaryAdminPage from "./page";
import { persistCanaryHit, __resetCanaryHitsForTests } from "@/lib/canaryHits";

describe("Canary admin page", () => {
  beforeEach(async () => {
    __resetCanaryHitsForTests();
    delete process.env.CANARY_ADMIN_KEY;
    await persistCanaryHit({
      tokenId: "uuid-1",
      variant: "pdf-text",
      ts: "2026-03-09T10:00:00.000Z",
      userAgent: "agent-1",
      referer: "https://example.com/a",
    });
    await persistCanaryHit({
      tokenId: "uuid-2",
      variant: "docx-hidden",
      ts: "2026-03-09T10:01:00.000Z",
      userAgent: "agent-2",
      referer: "https://example.com/b",
    });
  });

  it("renders recent canary hits when no admin key is set", () => {
    render(<CanaryAdminPage searchParams={{}} />);
    expect(screen.getByText(/Canary Wing hits/i)).toBeInTheDocument();
    expect(screen.getByText("uuid-2")).toBeInTheDocument();
    expect(screen.getByText("uuid-1")).toBeInTheDocument();
  });

  it("requires matching CANARY_ADMIN_KEY when configured", () => {
    process.env.CANARY_ADMIN_KEY = "secret-key";
    render(<CanaryAdminPage searchParams={{ key: "wrong-key" }} />);
    expect(screen.getByText(/Not authorized/i)).toBeInTheDocument();
  });
});

