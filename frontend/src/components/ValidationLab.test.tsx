import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithAudience } from "../test-utils";
import {
  ValidationLab,
  VALIDATION_PROMPTS,
} from "./ValidationLab";

describe("ValidationLab", () => {
  it("renders section title and Manual Mirror Protocol text", () => {
    renderWithAudience(
      <ValidationLab enabledEggIds={new Set()} />
    );

    expect(
      screen.getByRole("heading", { name: /validation lab/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/manual mirror protocol/i)
    ).toBeInTheDocument();
  });

  it("renders all four prompts with titles and descriptions", () => {
    renderWithAudience(
      <ValidationLab enabledEggIds={new Set()} />
    );

    expect(screen.getByText("BASE-00")).toBeInTheDocument();
    expect(screen.getByText("General Recruiter (Baseline)")).toBeInTheDocument();
    expect(
      screen.getByText(/establish a non-adversarial benchmark for candidate summarization/i)
    ).toBeInTheDocument();

    expect(screen.getByText("LLM01")).toBeInTheDocument();
    expect(screen.getByText("The Invisible Hand (Injection)")).toBeInTheDocument();
    expect(
      screen.getByText(/test for susceptibility to direct or indirect instruction hijacking/i)
    ).toBeInTheDocument();

    expect(screen.getByText("LLM02")).toBeInTheDocument();
    expect(screen.getByText("Metadata Shadow / Mailto (Insecure Output)")).toBeInTheDocument();
    expect(
      screen.getByText(/audit how the system handles untrusted data in structured fields/i)
    ).toBeInTheDocument();

    expect(screen.getByText("LLM09")).toBeInTheDocument();
    expect(screen.getByText("The Canary Wing (Overreliance)")).toBeInTheDocument();
    expect(
      screen.getByText(/simulate a scenario where the agent ignores red flags due to summary bias/i)
    ).toBeInTheDocument();
  });

  it("LLM01, LLM02, LLM09 have external links; BASE-00 does not", () => {
    renderWithAudience(
      <ValidationLab enabledEggIds={new Set()} />
    );

    const base00Card = screen.getByTestId("validation-prompt-BASE-00");
    expect(base00Card.querySelector('a[href]')).not.toBeInTheDocument();

    const llm01Link = screen.getByRole("link", { name: /LLM01/i });
    expect(llm01Link).toHaveAttribute("href", "https://genai.owasp.org/llm01-prompt-injection/");
    expect(llm01Link).toHaveAttribute("target", "_blank");
    expect(llm01Link).toHaveAttribute("rel", "noopener noreferrer");

    const llm02Link = screen.getByRole("link", { name: /LLM02/i });
    expect(llm02Link).toHaveAttribute("href", "https://genai.owasp.org/llm02-insecure-output-handling/");

    const llm09Link = screen.getByRole("link", { name: /LLM09/i });
    expect(llm09Link).toHaveAttribute("href", "https://genai.owasp.org/llm09-overreliance/");
  });

  it("copy button copies the correct prompt text and calls onPromptCopy with the right id", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const onPromptCopy = jest.fn();

    renderWithAudience(
      <ValidationLab enabledEggIds={new Set()} onPromptCopy={onPromptCopy} />
    );

    const llm01Prompt = VALIDATION_PROMPTS.find((p) => p.id === "LLM01")!;
    const copyBtn = screen.getByRole("button", { name: /copy LLM01 prompt/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(writeText).toHaveBeenCalledWith(llm01Prompt.prompt);
      expect(onPromptCopy).toHaveBeenCalledTimes(1);
      expect(onPromptCopy).toHaveBeenCalledWith("LLM01");
    });
  });

  it("when enabledEggIds contains invisible-hand, LLM01 card shows match badge", () => {
    renderWithAudience(
      <ValidationLab enabledEggIds={new Set(["invisible-hand"])} />
    );

    const matchBadge = screen.getByLabelText(/option for this test is turned on/i);
    expect(matchBadge).toBeInTheDocument();
    const llm01Card = screen.getByTestId("validation-prompt-LLM01");
    expect(llm01Card).toContainElement(matchBadge);
  });

  it("when enabledEggIds is empty, no match badge is shown", () => {
    renderWithAudience(
      <ValidationLab enabledEggIds={new Set()} />
    );

    expect(screen.queryByLabelText(/option for this test is turned on/i)).not.toBeInTheDocument();
  });

  it("when enabledEggIds contains metadata-shadow, LLM02 card shows match badge", () => {
    renderWithAudience(
      <ValidationLab enabledEggIds={new Set(["metadata-shadow"])} />
    );

    const matchBadge = screen.getByLabelText(/option for this test is turned on/i);
    const llm02Card = screen.getByTestId("validation-prompt-LLM02");
    expect(llm02Card).toContainElement(matchBadge);
  });

  it("when enabledEggIds contains canary-wing, LLM09 card shows match badge", () => {
    renderWithAudience(
      <ValidationLab enabledEggIds={new Set(["canary-wing"])} />
    );

    const matchBadge = screen.getByLabelText(/option for this test is turned on/i);
    const llm09Card = screen.getByTestId("validation-prompt-LLM09");
    expect(llm09Card).toContainElement(matchBadge);
  });
});
