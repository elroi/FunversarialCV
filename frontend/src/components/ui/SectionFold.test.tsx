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

  it("opens when expandRevision increases while starting collapsed", () => {
    const { rerender } = render(
      <SectionFold
        title="Sync open"
        titleId="so-title"
        contentId="so-body"
        ariaLabel="Sync open: toggle"
        defaultExpanded={false}
        expandRevision={0}
      >
        <p>Revealed by signal</p>
      </SectionFold>
    );

    expect(screen.queryByText("Revealed by signal")).not.toBeVisible();

    rerender(
      <SectionFold
        title="Sync open"
        titleId="so-title"
        contentId="so-body"
        ariaLabel="Sync open: toggle"
        defaultExpanded={false}
        expandRevision={1}
      >
        <p>Revealed by signal</p>
      </SectionFold>
    );

    expect(screen.getByText("Revealed by signal")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /sync open: toggle/i })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("uses the same compact trigger padding as CollapsibleCard (px-3 py-2, full width)", () => {
    render(
      <SectionFold
        title="Aligned"
        titleId="align-title"
        contentId="align-body"
        ariaLabel="Aligned: toggle"
      >
        <p>Body</p>
      </SectionFold>
    );
    const btn = screen.getByRole("button", { name: /aligned: toggle/i });
    expect(btn.className).toContain("px-3");
    expect(btn.className).toContain("py-2");
    expect(btn.className).toContain("w-full");
    expect(btn.className).not.toContain("-mx-4");
    expect(btn.className).toContain("items-center");
  });
});
