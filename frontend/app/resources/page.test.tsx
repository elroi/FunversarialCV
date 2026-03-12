import React from "react";
import { render, screen } from "@testing-library/react";
import ResourcesPage from "./page";

describe("Resources page", () => {
  it("renders the main Resources heading", () => {
    render(<ResourcesPage />);
    expect(
      screen.getByRole("heading", { name: /funversarialcv/i, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/PII Mode: Stateless/i)).toBeInTheDocument();
    expect(screen.getByText(/Engine Online/i)).toBeInTheDocument();
  });

  it("explains why Funversarial CVs exist", () => {
    render(<ResourcesPage />);
    expect(
      screen.getByText(/why funversarial cvs\?/i)
    ).toBeInTheDocument();
    const educationalMentions = screen.getAllByText(/educational tool/i);
    expect(educationalMentions.length).toBeGreaterThan(0);
  });

  it("has dedicated sections for candidates and hiring teams", () => {
    render(<ResourcesPage />);
    expect(
      screen.getByRole("heading", { name: /resources/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /for candidates/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /for hiring teams/i, level: 2 })
    ).toBeInTheDocument();
  });

  it("provides a Back home link to the main app", () => {
    render(<ResourcesPage />);
    const link = screen.getByRole("link", { name: /back home/i });
    expect(link).toBeInTheDocument();
    expect((link as HTMLAnchorElement).getAttribute("href")).toBe("/");
  });

  it("documents the Stateless Vault, PII dehydration, and zero-retention model", () => {
    render(<ResourcesPage />);
    expect(
      screen.getByText(/Stateless Vault model/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/PII dehydration/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/zero-retention/i)
    ).toBeInTheDocument();
  });
});

