import React from "react";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children and supports primary variant", () => {
    render(<Button variant="primary">Harden</Button>);
    const btn = screen.getByRole("button", { name: /harden/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass("border-neon-green");
  });

  it("applies disabled state and aria-disabled when disabled", () => {
    render(<Button variant="primary" disabled>Submit</Button>);
    const btn = screen.getByRole("button", { name: /submit/i });
    expect(btn).toBeDisabled();
  });

  it("forwards aria-label", () => {
    render(<Button variant="primary" aria-label="Retry">Retry</Button>);
    expect(screen.getByRole("button", { name: /retry/i })).toHaveAttribute("aria-label", "Retry");
  });
});
