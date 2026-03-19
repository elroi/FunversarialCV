import React from "react";
import { screen } from "@testing-library/react";
import { renderWithAudience } from "../../src/test-utils";
import ResourcesPage from "./page";

describe("Resources page", () => {
  it("renders the main Resources heading", () => {
    renderWithAudience(<ResourcesPage />);
    expect(
      screen.getByRole("heading", { name: /funversarialcv/i, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/PII Mode: Stateless/i)).toBeInTheDocument();
    expect(screen.getByText(/Engine Online/i)).toBeInTheDocument();
  });

  it("explains why Funversarial CVs exist", () => {
    renderWithAudience(<ResourcesPage />);
    expect(
      screen.getByText(/why funversarial cvs\?/i)
    ).toBeInTheDocument();
    const educationalMentions = screen.getAllByText(/educational tool/i);
    expect(educationalMentions.length).toBeGreaterThan(0);
  });

  it("includes an ethical use disclaimer making usage the user's responsibility", () => {
    renderWithAudience(<ResourcesPage />);
    expect(
      screen.getByRole("heading", {
        name: /usage and responsibility/i,
        level: 2,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/educational and research purposes only/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/you are solely responsible/i)
    ).toBeInTheDocument();
  });

  it("has dedicated sections for candidates and hiring teams", () => {
    renderWithAudience(<ResourcesPage />);
    expect(
      screen.getByRole("heading", { name: /for candidates/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /for hiring teams/i, level: 2 })
    ).toBeInTheDocument();
  });

  it("provides a Back home link to the main app", () => {
    renderWithAudience(<ResourcesPage />);
    const link = screen.getByRole("link", { name: /back home/i });
    expect(link).toBeInTheDocument();
    expect((link as HTMLAnchorElement).getAttribute("href")).toBe("/");
  });

  it("documents the Stateless Vault, PII dehydration, and zero-retention model", () => {
    renderWithAudience(<ResourcesPage />);
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

  it("states that dehydration and rehydration occur in the browser and gives verification steps for security reviewers", () => {
    renderWithAudience(<ResourcesPage />);
    expect(
      screen.getByText(/dehydration and rehydration occur in your browser/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/for security reviewers/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/POST \/api\/harden/i)
    ).toBeInTheDocument();
  });

  it("links out to OWASP Top 10 for LLM Applications and a recommended talk", () => {
    renderWithAudience(<ResourcesPage />);
    expect(
      screen.getByRole("link", { name: /owasp top 10 for llm applications/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /recommended talk: owasp's top 10 ways to attack llms/i })
    ).toBeInTheDocument();
  });

  it("describes the Stateless Vault processing flow in sequence", () => {
    renderWithAudience(<ResourcesPage />);
    expect(
      screen.getByText(/processing flow \(stateless vault\)/i)
    ).toBeInTheDocument();
    const steps = screen.getAllByText(/load|dehydrate pii|apply eggs|stream & purge/i);
    expect(steps.length).toBeGreaterThanOrEqual(4);
  });

  it("renders a simple system diagram that matches the Stateless Vault flow", () => {
    renderWithAudience(<ResourcesPage />);
    const heading = screen.getByText(/system diagram/i);
    expect(heading).toBeInTheDocument();
    const asciiBlock = heading
      .closest("section")
      ?.querySelector("pre");
    expect(asciiBlock).not.toBeNull();
    expect(asciiBlock?.textContent || "").toMatch(/\[1] Load/i);
    expect(asciiBlock?.textContent || "").toMatch(/\[4] Apply eggs/i);
    expect(asciiBlock?.textContent || "").toMatch(/\[6] Stream & purge/i);
  });

  it("explains what eggs are and references easter eggs", () => {
    renderWithAudience(<ResourcesPage />);
    const headings = screen.getAllByRole("heading", {
      name: /what are eggs\?/i,
      level: 2,
    });
    expect(headings.length).toBeGreaterThan(0);
    const easterEggMentions = screen.getAllByText(
      /inspired by classic easter eggs/i
    );
    expect(easterEggMentions.length).toBeGreaterThan(0);
  });

  it("provides a Get started section including guidance to use demo CVs", () => {
    renderWithAudience(<ResourcesPage />);
    expect(
      screen.getByRole("heading", { name: /get started/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/want to try this out but afraid to upload your own file\?/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/use the built-in demo cvs/i)
    ).toBeInTheDocument();
  });
});

