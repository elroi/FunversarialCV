import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithAudience } from "../test-utils";
import {
  ValidationLab,
  VALIDATION_PROMPTS,
} from "./ValidationLab";

/** Opens a prompt row by id (outer Validation Lab section must already be expanded on page). */
function expandPrompt(promptId: string) {
  fireEvent.click(
    screen.getByRole("button", {
      name: new RegExp(`prompt ${promptId}: show or hide`, "i"),
    })
  );
}

describe("ValidationLab", () => {
  it("renders protocol copy and per-prompt rows without an outer fold", () => {
    renderWithAudience(<ValidationLab enabledEggIds={new Set()} />);

    expect(
      screen.getByText(/How to test your CV|Manual Mirror Protocol/i)
    ).toBeInTheDocument();
    expect(screen.getByText("BASE-00")).toBeInTheDocument();
    expect(screen.getByText("General Recruiter (Baseline)")).toBeInTheDocument();
  });

  it("keeps prompt descriptions inside collapsed prompt panels until expanded", () => {
    renderWithAudience(<ValidationLab enabledEggIds={new Set()} />);

    const base00Panel = document.getElementById("validation-prompt-BASE-00-content");
    expect(base00Panel).toBeTruthy();
    expect(base00Panel).toHaveClass("hidden");

    expandPrompt("BASE-00");
    expect(
      screen.getByText(/establish a non-adversarial benchmark for candidate summarization/i)
    ).toBeInTheDocument();

    expandPrompt("LLM01");
    expect(
      screen.getByText(/test for susceptibility to direct or indirect instruction hijacking/i)
    ).toBeInTheDocument();

    expandPrompt("LLM02");
    expect(
      screen.getByText(/audit how the system handles untrusted data in structured fields/i)
    ).toBeInTheDocument();

    expandPrompt("LLM09");
    expect(
      screen.getByText(/simulate a scenario where the agent ignores red flags due to summary bias/i)
    ).toBeInTheDocument();
  });

  it("LLM01, LLM02, LLM09 have external links in expanded body; BASE-00 does not", () => {
    renderWithAudience(<ValidationLab enabledEggIds={new Set()} />);

    const base00Card = screen.getByTestId("validation-prompt-BASE-00");
    expandPrompt("BASE-00");
    expect(base00Card.querySelector("a[href]")).not.toBeInTheDocument();

    expandPrompt("LLM01");
    const llm01Link = screen.getByRole("link", { name: /LLM01/i });
    expect(llm01Link).toHaveAttribute("href", "https://genai.owasp.org/llm01-prompt-injection/");
    expect(llm01Link).toHaveAttribute("target", "_blank");
    expect(llm01Link).toHaveAttribute("rel", "noopener noreferrer");

    expandPrompt("LLM02");
    const llm02Link = screen.getByRole("link", { name: /LLM02/i });
    expect(llm02Link).toHaveAttribute("href", "https://genai.owasp.org/llm02-insecure-output-handling/");

    expandPrompt("LLM09");
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

    expandPrompt("LLM01");

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
    renderWithAudience(<ValidationLab enabledEggIds={new Set()} />);

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
