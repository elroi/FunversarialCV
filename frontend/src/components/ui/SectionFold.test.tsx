/**
 * Section fold: major page regions with a disclosure trigger.
 */
import React, { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionFold } from "./SectionFold";

describe("SectionFold", () => {
  it("merges titleTriggerClassName onto the title button", () => {
    render(
      <SectionFold
        title="Upload channel"
        titleId="t1"
        contentId="c1"
        ariaLabel="Upload: show or hide"
        titleTriggerClassName="pulse-test-class"
      >
        <p>Body</p>
      </SectionFold>
    );
    const btn = screen.getByRole("button", { name: /upload: show or hide/i });
    expect(btn).toHaveClass("pulse-test-class");
    expect(btn).toHaveClass("uppercase");
  });

  it("forwards ref to the title trigger button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <SectionFold
        ref={ref}
        title="Lab"
        titleId="t2"
        contentId="c2"
        ariaLabel="Lab: show or hide"
      >
        <p>Content</p>
      </SectionFold>
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe("BUTTON");
    expect(ref.current?.id).toBe("t2");
  });

  it("toggles region visibility on trigger click", () => {
    render(
      <SectionFold
        title="Section"
        titleId="t3"
        contentId="c3"
        ariaLabel="Section: show or hide"
        defaultExpanded
      >
        <p>Inside</p>
      </SectionFold>
    );
    expect(screen.getByText("Inside")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /section: show or hide/i }));
    expect(screen.getByText("Inside")).not.toBeVisible();
  });
});
