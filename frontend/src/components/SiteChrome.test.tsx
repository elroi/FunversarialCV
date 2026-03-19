/**
 * Shared site chrome: header + top bar (mobile-first layout, no duplicate markup across routes).
 */
import React from "react";
import { screen } from "@testing-library/react";
import { renderWithAudience } from "../test-utils";
import { SiteHeader, SiteTopBar } from "./SiteChrome";

describe("SiteHeader", () => {
  it("renders FunversarialCV title and tagline from copy", () => {
    renderWithAudience(<SiteHeader />);
    expect(
      screen.getByRole("heading", { name: /funversarialcv/i, level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/adversarial cv hardening console/i)
    ).toBeInTheDocument();
  });
});

describe("SiteTopBar", () => {
  it("renders toolbar with privacy badge, audience group, engine status, and nav link", () => {
    renderWithAudience(
      <SiteTopBar navLink={{ href: "/resources", label: "Resources" }} />
    );
    expect(
      screen.getByRole("toolbar", { name: /site navigation and audience/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/PII Mode: Stateless/i)).toBeInTheDocument();
    expect(
      screen.getByRole("group", {
        name: /choose audience: for security pros or for hr/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/Engine Online/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /resources/i });
    expect(link).toHaveAttribute("href", "/resources");
  });
});
