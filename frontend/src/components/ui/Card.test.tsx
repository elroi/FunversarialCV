import React from "react";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children with noir-shell and border styles", () => {
    render(<Card>Content</Card>);
    expect(screen.getByText("Content")).toBeInTheDocument();
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("noir-shell");
    expect(card).toHaveClass("rounded-xl");
    expect(card).toHaveClass("border-border");
  });
});
