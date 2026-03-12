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

  it("includes an ethical use disclaimer making usage the user's responsibility", () => {
    render(<ResourcesPage />);
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
    render(<ResourcesPage />);
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

  it("links out to OWASP Top 10 for LLM Applications and a recommended talk", () => {
    render(<ResourcesPage />);
    expect(
      screen.getByRole("link", { name: /owasp top 10 for llm applications/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /recommended talk: owasp's top 10 ways to attack llms/i })
    ).toBeInTheDocument();
  });

  it("describes the Stateless Vault processing flow in sequence", () => {
    render(<ResourcesPage />);
    expect(
      screen.getByText(/processing flow \(stateless vault\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/accept/i)).toBeInTheDocument();
    expect(screen.getByText(/dehydrate pii/i)).toBeInTheDocument();
    expect(screen.getByText(/apply eggs/i)).toBeInTheDocument();
    expect(screen.getByText(/stream & purge/i)).toBeInTheDocument();
  });

  it("explains what eggs are and references easter eggs", () => {
    render(<ResourcesPage />);
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
    render(<ResourcesPage />);
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

