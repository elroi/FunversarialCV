import React from "react";
import { screen } from "@testing-library/react";
import { hrCopy } from "../copy/hr";
import { renderWithAudience } from "../test-utils";
import { DualityMonitor } from "./DualityMonitor";
import type { DualityCheckResult } from "../engine/dualityCheck";

const baseDualityResult: DualityCheckResult = {
  hasSuspiciousPatterns: false,
  matchedPatterns: [],
};

describe("DualityMonitor", () => {
  it("renders all processor stages", () => {
    renderWithAudience(
      <DualityMonitor
        processingState="idle"
        log={[]}
        dualityResult={baseDualityResult}
      />
    );

    expect(screen.getByText(hrCopy.stageAccept)).toBeInTheDocument();
    expect(screen.getByText(hrCopy.stageDualityCheck)).toBeInTheDocument();
    expect(screen.getByText(hrCopy.stageDehydration)).toBeInTheDocument();
    expect(screen.getByText(hrCopy.stageInjection)).toBeInTheDocument();
    expect(screen.getByText(hrCopy.stageRehydration)).toBeInTheDocument();
  });

  it("shows a friendly message when no suspicious patterns are found", () => {
    renderWithAudience(
      <DualityMonitor
        processingState="completed"
        log={[]}
        dualityResult={baseDualityResult}
      />
    );

    expect(screen.getByText(hrCopy.noSuspiciousPatterns)).toBeInTheDocument();
  });

  it("lists matched patterns when the duality check finds issues", () => {
    const resultWithFindings: DualityCheckResult = {
      hasSuspiciousPatterns: true,
      matchedPatterns: ["ignore_previous_instructions", "jailbreak_style"],
      details: ["ignore_previous_instructions: 2 match(es)"],
    };

    renderWithAudience(
      <DualityMonitor
        processingState="completed"
        log={[]}
        dualityResult={resultWithFindings}
      />
    );

    expect(screen.getByText(hrCopy.preHardeningScanTitle)).toBeInTheDocument();
    expect(screen.getAllByText(/ignore_previous_instructions/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/jailbreak_style/i)).toBeInTheDocument();
    expect(
      screen.getByText(/ignore_previous_instructions: 2 match\(es\)/i)
    ).toBeInTheDocument();
  });

  it("shows Remediation block with message when existing adversarial layer detected", () => {
    const resultWithFindings: DualityCheckResult = {
      hasSuspiciousPatterns: true,
      matchedPatterns: ["existing_canary_url"],
      details: ["existing_canary_url: 1 match(es)"],
    };

    renderWithAudience(
      <DualityMonitor
        processingState="completed"
        log={[]}
        dualityResult={resultWithFindings}
      />
    );

    expect(screen.getByText(hrCopy.dualityRemediationLabel)).toBeInTheDocument();
    expect(screen.getByText(hrCopy.dualityRemediationMessage)).toBeInTheDocument();
  });

  it("renders terminal log entries", () => {
    renderWithAudience(
      <DualityMonitor
        processingState="processing"
        log={[
          {
            id: "1",
            stage: "accept",
            level: "info",
            message: "[ACCEPT] Buffer received.",
          },
          {
            id: "2",
            stage: "duality-check",
            level: "success",
            message: "[DUALITY] Scan completed.",
          },
        ]}
        dualityResult={baseDualityResult}
      />
    );

    expect(screen.getByText(/\[ACCEPT] Buffer received\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/\[DUALITY] Scan completed\./i)
    ).toBeInTheDocument();
  });

  it("describes what Duality means in the pre-hardening scan header and tooltip", () => {
    renderWithAudience(
      <DualityMonitor
        processingState="idle"
        log={[]}
        dualityResult={baseDualityResult}
      />
    );

    const heading = screen.getByText(hrCopy.preHardeningScanTitle);
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute("title", hrCopy.preHardeningScanTooltip);
  });

  it("copies terminal log text to clipboard when Copy Log is clicked", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    renderWithAudience(
      <DualityMonitor
        processingState="completed"
        log={[
          {
            id: "1",
            stage: "accept",
            level: "info",
            message: "[ACCEPT] Buffer received.",
          },
          {
            id: "2",
            stage: "duality-check",
            level: "success",
            message: "[DUALITY] Scan completed.",
          },
        ]}
        dualityResult={baseDualityResult}
      />
    );

    const btn = screen.getByRole("button", { name: /copy log to clipboard/i });
    await btn.click();

    expect(writeText).toHaveBeenCalled();
    const copied = (writeText.mock.calls[0][0] as string) || "";
    expect(copied).toMatch(/\[ACCEPT] Buffer received\./i);
    expect(copied).toMatch(/\[DUALITY] Scan completed\./i);
  });
});

