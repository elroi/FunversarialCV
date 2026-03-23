import React, { useState } from "react";
import { screen, fireEvent, act, waitFor } from "@testing-library/react";
import { renderWithAudience } from "../test-utils";
import { securityCopy } from "../copy/security";
import { hrCopy } from "../copy/hr";
import { IncidentMailtoConfigCard } from "./IncidentMailtoConfigCard";

const AUDIENCE_KEY = "funversarialcv-audience";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expandButtonRe(title: string): RegExp {
  return new RegExp(`^Expand ${escapeRe(title)} config$`, "i");
}

function Harness() {
  const [payload, setPayload] = useState("");
  return (
    <IncidentMailtoConfigCard
      payload={payload}
      onPayloadChange={setPayload}
      disabled={false}
    />
  );
}

describe("IncidentMailtoConfigCard", () => {
  afterEach(() => {
    window.localStorage.removeItem(AUDIENCE_KEY);
  });

  it("security audience shows persona intro and expand control references Mailto Surprise", async () => {
    window.localStorage.setItem(AUDIENCE_KEY, "security");
    renderWithAudience(<Harness />);

    const expand = await waitFor(() =>
      screen.getByRole("button", { name: expandButtonRe(securityCopy.eggIncidentMailtoTitle) })
    );
    await act(async () => {
      fireEvent.click(expand);
    });

    expect(
      screen.getByText(securityCopy.incidentMailtoDescription)
    ).toBeInTheDocument();
  });

  it("hr audience shows persona intro from hr copy", async () => {
    window.localStorage.setItem(AUDIENCE_KEY, "hr");
    renderWithAudience(<Harness />);

    const expand = await waitFor(() =>
      screen.getByRole("button", { name: expandButtonRe(hrCopy.eggIncidentMailtoTitle) })
    );
    await act(async () => {
      fireEvent.click(expand);
    });

    expect(screen.getByText(hrCopy.incidentMailtoDescription)).toBeInTheDocument();
  });
});
