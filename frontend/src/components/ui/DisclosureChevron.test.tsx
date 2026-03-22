import React from "react";
import { render, screen } from "@testing-library/react";
import { DisclosureChevron } from "./DisclosureChevron";

describe("DisclosureChevron", () => {
  it("shows down chevron when expanded and right when collapsed", () => {
    const { rerender } = render(<DisclosureChevron expanded />);
    expect(screen.getByText("▼")).toBeInTheDocument();
    rerender(<DisclosureChevron expanded={false} />);
    expect(screen.getByText("▶")).toBeInTheDocument();
  });
});
