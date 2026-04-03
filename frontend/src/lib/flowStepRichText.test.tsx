import React from "react";
import { render, screen } from "@testing-library/react";
import { renderFlowStepLine } from "./flowStepRichText";

describe("renderFlowStepLine", () => {
  it("returns plain text when there are no links", () => {
    const { container } = render(<>{renderFlowStepLine("No links here.")}</>);
    expect(container.textContent).toBe("No links here.");
  });

  it("renders internal hash link", () => {
    render(
      <>{renderFlowStepLine("Open [Try in an AI tool](#validation-lab) below.")}</>
    );
    const a = screen.getByRole("link", { name: /Try in an AI tool/i });
    expect(a).toHaveAttribute("href", "#validation-lab");
    expect(a).not.toHaveAttribute("target");
  });

  it("renders external link with target and rel", () => {
    render(
      <>
        {renderFlowStepLine(
          "See [Claude](https://claude.ai/) for chat."
        )}
      </>
    );
    const a = screen.getByRole("link", { name: "Claude" });
    expect(a).toHaveAttribute("href", "https://claude.ai/");
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", "noopener noreferrer");
  });
});
