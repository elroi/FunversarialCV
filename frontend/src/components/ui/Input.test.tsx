import React from "react";
import { render, screen } from "@testing-library/react";
import { Input } from "./Input";

describe("Input", () => {
  it("renders with focus-visible ring classes", () => {
    render(<Input placeholder="Test" aria-label="Test input" />);
    const input = screen.getByLabelText("Test input");
    expect(input).toHaveClass("focus:border-neon-cyan");
    expect(input).toHaveClass("focus-visible:ring-2");
  });

  it("has 44px minimum height for touch target", () => {
    render(<Input aria-label="Test" />);
    expect(screen.getByLabelText("Test")).toHaveClass("min-h-[44px]");
  });

  it("supports disabled", () => {
    render(<Input disabled aria-label="Test" />);
    expect(screen.getByLabelText("Test")).toBeDisabled();
  });
});
