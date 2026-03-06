import React from "react";
import { render, screen } from "@testing-library/react";
import { DualityMonitor } from "./DualityMonitor";
import type { DualityCheckResult } from "../engine/dualityCheck";

const baseDualityResult: DualityCheckResult = {
  hasSuspiciousPatterns: false,
  matchedPatterns: [],
};

describe("DualityMonitor", () => {
  it("renders all processor stages", () => {
    render(
      <DualityMonitor
        processingState="idle"
        log={[]}
        dualityResult={baseDualityResult}
      />
    );

    expect(screen.getByText(/accept buffer/i)).toBeInTheDocument();
    expect(screen.getByText(/duality check/i)).toBeInTheDocument();
    expect(screen.getByText(/dehydration/i)).toBeInTheDocument();
    expect(screen.getByText(/injection/i)).toBeInTheDocument();
    expect(screen.getByText(/rehydration/i)).toBeInTheDocument();
  });

  it("shows a friendly message when no suspicious patterns are found", () => {
    render(
      <DualityMonitor
        processingState="completed"
        log={[]}
        dualityResult={baseDualityResult}
      />
    );

    expect(
      screen.getByText(/no suspicious prompt-injection patterns detected/i)
    ).toBeInTheDocument();
  });

  it("lists matched patterns when the duality check finds issues", () => {
    const resultWithFindings: DualityCheckResult = {
      hasSuspiciousPatterns: true,
      matchedPatterns: ["ignore_previous_instructions", "jailbreak_style"],
      details: ["ignore_previous_instructions: 2 match(es)"],
    };

    render(
      <DualityMonitor
        processingState="completed"
        log={[]}
        dualityResult={resultWithFindings}
      />
    );

    expect(screen.getByText(/pre-hardening scan/i)).toBeInTheDocument();
    expect(
      screen.getByText(/ignore_previous_instructions/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/jailbreak_style/i)).toBeInTheDocument();
    expect(
      screen.getByText(/ignore_previous_instructions: 2 match\(es\)/i)
    ).toBeInTheDocument();
  });

  it("shows Remediation block with message when existing adversarial layer detected", () => {
    // When Jest/JSX is fixed: asserts Remediation label and generic message are present.
    const resultWithFindings: DualityCheckResult = {
      hasSuspiciousPatterns: true,
      matchedPatterns: ["existing_canary_url"],
      details: ["existing_canary_url: 1 match(es)"],
    };

    render(
      <DualityMonitor
        processingState="completed"
        log={[]}
        dualityResult={resultWithFindings}
      />
    );

    expect(screen.getByText("Remediation")).toBeInTheDocument();
    expect(
      screen.getByText(
        /existing adversarial layers.*may decrease document readability for modern LLM parsers/i
      )
    ).toBeInTheDocument();
  });

  it("renders terminal log entries", () => {
    render(
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
});

