/**
 * Shared site chrome: header + top bar (mobile-first layout, no duplicate markup across routes).
 */
import React from "react";
import { screen } from "@testing-library/react";
import { renderWithAudience } from "../test-utils";
import { SiteHeader, SiteTopBar } from "./SiteChrome";

beforeEach(() => {
  window.localStorage.setItem("funversarialcv-audience", "security");
});

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
  it("renders toolbar with privacy badge and audience group (no decorative status pill)", () => {
    renderWithAudience(<SiteTopBar />);
    expect(
      screen.getByRole("toolbar", { name: /privacy note and audience/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/PII · client vault/i)).toBeInTheDocument();
    expect(
      screen.getByRole("group", {
        name: /choose audience: for security pros or for hr/i,
      })
    ).toBeInTheDocument();
  });
});

describe("SiteHeader secondary nav", () => {
  it("renders Resources as a text link when secondaryNav is set", () => {
    renderWithAudience(
      <SiteHeader secondaryNav={{ href: "/resources", label: "Resources" }} />
    );
    const link = screen.getByRole("link", { name: /resources/i });
    expect(link).toHaveAttribute("href", "/resources");
  });
});
