import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionFold } from "./SectionFold";

describe("SectionFold", () => {
  it("is expanded by default and hides body when toggled", () => {
    render(
      <SectionFold
        title="Test Section"
        titleId="ts-title"
        contentId="ts-body"
        ariaLabel="Test Section: show or hide"
        defaultExpanded
      >
        <p>Inside body</p>
      </SectionFold>
    );

    expect(screen.getByText("Inside body")).toBeVisible();
    const btn = screen.getByRole("button", { name: /test section: show or hide/i });
    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(btn);
    expect(screen.queryByText("Inside body")).not.toBeVisible();
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("starts collapsed when defaultExpanded is false", () => {
    render(
      <SectionFold
        title="Closed"
        titleId="c-title"
        contentId="c-body"
        ariaLabel="Closed: toggle"
        defaultExpanded={false}
      >
        <p>Hidden at first</p>
      </SectionFold>
    );

    expect(screen.queryByText("Hidden at first")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /closed: toggle/i }));
    expect(screen.getByText("Hidden at first")).toBeVisible();
  });
});
