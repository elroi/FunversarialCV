import React, { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { renderWithAudience } from "../test-utils";
import { CanaryWingConfigCard } from "./CanaryWingConfigCard";

function Harness() {
  const [payload, setPayload] = useState("");
  return (
    <CanaryWingConfigCard
      payload={payload}
      onPayloadChange={setPayload}
      disabled={false}
    />
  );
}

describe("CanaryWingConfigCard", () => {
  it("Maximum preset sets link text without an update loop", async () => {
    const warn = jest.spyOn(console, "error").mockImplementation(() => {});

    renderWithAudience(<Harness />);

    const expand = screen.getByRole("button", { name: /expand.*canary wing/i });
    await act(async () => {
      fireEvent.click(expand);
    });

    const maximum = screen.getByRole("button", { name: /^maximum$/i });
    await act(async () => {
      fireEvent.click(maximum);
    });

    expect(
      screen.getByPlaceholderText(/optional custom link text/i)
    ).toHaveValue("Verify document integrity");

    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining("Maximum update depth exceeded"),
      expect.anything()
    );
    warn.mockRestore();
  });
});
