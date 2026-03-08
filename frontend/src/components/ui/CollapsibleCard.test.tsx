import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CollapsibleCard } from "./CollapsibleCard";

describe("CollapsibleCard", () => {
  it("renders title and is collapsed by default", () => {
    render(
      <CollapsibleCard
        title="Test Egg"
        titleId="test-title"
        contentId="test-content"
        ariaLabel="Expand Test Egg config"
      >
        <p>Body content</p>
      </CollapsibleCard>
    );
    expect(screen.getByRole("button", { name: /expand test egg config/i })).toBeInTheDocument();
    expect(screen.getByText("Test Egg")).toBeInTheDocument();
    const content = document.getElementById("test-content");
    expect(content).toHaveClass("hidden");
  });

  it("shows content when trigger is clicked", () => {
    render(
      <CollapsibleCard
        title="Test Egg"
        titleId="test-title"
        contentId="test-content"
        ariaLabel="Expand Test Egg config"
      >
        <p>Body content</p>
      </CollapsibleCard>
    );
    const trigger = screen.getByRole("button", { name: /expand test egg config/i });
    fireEvent.click(trigger);
    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(document.getElementById("test-content")).not.toHaveClass("hidden");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("hides content when trigger is clicked again", () => {
    render(
      <CollapsibleCard
        title="Test Egg"
        titleId="test-title"
        contentId="test-content"
        ariaLabel="Expand Test Egg config"
      >
        <p>Body content</p>
      </CollapsibleCard>
    );
    const trigger = screen.getByRole("button", { name: /expand test egg config/i });
    fireEvent.click(trigger);
    expect(document.getElementById("test-content")).not.toHaveClass("hidden");
    fireEvent.click(trigger);
    expect(document.getElementById("test-content")).toHaveClass("hidden");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
