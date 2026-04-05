import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithAudience } from "../test-utils";

beforeEach(() => {
  window.localStorage.removeItem("funversarialcv-audience");
});
import { ValidationLab } from "./ValidationLab";
import { hrCopy } from "../copy/hr";

/** Opens a prompt row by id (outer Validation Lab section must already be expanded on page). */
function expandPrompt(promptId: string) {
  fireEvent.click(
    screen.getByRole("button", {
      name: new RegExp(`prompt ${promptId}: show or hide`, "i"),
    })
  );
}

function expandSampleJobDescription() {
  fireEvent.click(
    screen.getByRole("button", {
      name: /Sample job description: show or hide/i,
    })
  );
}

/** Default `AudienceProvider` tests as HR; badge aria matches `hrCopy.validationMatchBadgeAriaLabel`. */
const matchBadgeAriaHr = /Enabled:.*last successful run on this page/i;

describe("ValidationLab", () => {
  it("renders sample JD, protocol copy, and per-prompt rows without an outer fold", () => {
    renderWithAudience(<ValidationLab armedEggIds={new Set()} />);

    expect(screen.getByTestId("validation-sample-jd")).toBeInTheDocument();
    expect(screen.getByText(/Sample job description \(synthetic\)/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /External comparative evaluation/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText("BASE-00")).toBeInTheDocument();
    expect(screen.getByText("BASE-01")).toBeInTheDocument();
    expect(screen.getByText("First message: job description next")).toBeInTheDocument();
  });

  it("renders structured protocol steps and security copy for badge explainer and list caption", async () => {
    window.localStorage.setItem("funversarialcv-audience", "security");
    renderWithAudience(<ValidationLab armedEggIds={new Set()} />);

    await waitFor(() => {
      expect(screen.getByText("About the ENABLED badge")).toBeInTheDocument();
    });
    expect(screen.getByText("Test prompts")).toBeInTheDocument();
    expect(screen.getByText("Thread setup (before job description)")).toBeInTheDocument();
    expect(screen.getByText(/Open the Ingestion lab below/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy the BASE-00 prompt below/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /First—baseline: if using the sample CV, download the generated sample Word file before you add adversarial payloads/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/In one tab: attach the baseline CV/i)).toBeInTheDocument();
  });

  it("renders protocol step with vendor examples as external links", () => {
    window.localStorage.setItem("funversarialcv-audience", "security");
    renderWithAudience(<ValidationLab armedEggIds={new Set()} />);

    const claude = screen.getByRole("link", { name: "Claude" });
    expect(claude).toHaveAttribute("href", "https://claude.ai/");
    const gemini = screen.getByRole("link", { name: "Gemini" });
    expect(gemini).toHaveAttribute("href", "https://gemini.google.com/");
    const copilot = screen.getByRole("link", { name: "Copilot" });
    expect(copilot).toHaveAttribute("href", "https://copilot.microsoft.com/");
    [claude, gemini, copilot].forEach((a) => {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  it("uses HR copy for badge explainer and prompt list caption", async () => {
    renderWithAudience(<ValidationLab armedEggIds={new Set()} />);

    await waitFor(() => {
      expect(screen.getByText("About the Enabled badge")).toBeInTheDocument();
    });
    expect(screen.getByText("Sample prompts")).toBeInTheDocument();
  });

  it("renders HR harness-first protocol copy", async () => {
    renderWithAudience(<ValidationLab armedEggIds={new Set()} />);
    await waitFor(() => {
      expect(
        screen.getByText(/Open What the file says below\. Upload a Word file/i)
      ).toBeInTheDocument();
    });
  });

  it("parse-fallback path uses the same details disclosure for the badge hint as the parsed path", () => {
    window.localStorage.setItem("funversarialcv-audience", "security");
    const unparsable =
      "Invalid protocol headline\n\nBody without parenthesized step numbers so parse returns null.";
    renderWithAudience(
      <ValidationLab
        armedEggIds={new Set()}
        manualMirrorProtocolOverride={unparsable}
      />
    );

    const summary = screen.getByText("About the ENABLED badge").closest("summary");
    expect(summary).toBeTruthy();
    fireEvent.click(summary!);
    expect(
      screen.getByText(/last successful Inject Eggs run on this page/i)
    ).toBeInTheDocument();
  });

  it("keeps prompt descriptions inside collapsed prompt panels until expanded", () => {
    renderWithAudience(<ValidationLab armedEggIds={new Set()} />);

    const base00Panel = document.getElementById("validation-prompt-BASE-00-content");
    expect(base00Panel).toBeTruthy();
    expect(base00Panel).toHaveClass("hidden");

    expandPrompt("BASE-00");
    expect(
      screen.getByText(
        /Send this first in your external AI tool: the job description will follow in the next message/i
      )
    ).toBeInTheDocument();

    expandPrompt("BASE-01");
    expect(
      screen.getByText(
        /Use after the job description, with the CV in the same message or attached \(see numbered steps above\)/i
      )
    ).toBeInTheDocument();

    expandPrompt("LLM01");
    expect(
      screen.getByText(/Tests whether hidden instructions in the CV change the reply/i)
    ).toBeInTheDocument();

    expandPrompt("LLM02");
    expect(
      screen.getByText(/Looks at structured fields and contact details/i)
    ).toBeInTheDocument();

    expandPrompt("LLM09");
    expect(
      screen.getByText(/Tests whether the AI over-trusts a positive summary/i)
    ).toBeInTheDocument();
  });

  it("LLM01, LLM02, LLM09 have external links in expanded body; BASE-00 does not", () => {
    renderWithAudience(<ValidationLab armedEggIds={new Set()} />);

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
      <ValidationLab armedEggIds={new Set()} onPromptCopy={onPromptCopy} />
    );

    expandPrompt("LLM01");

    const llm01Prompt = hrCopy.validationPrompts.find((p) => p.id === "LLM01")!;
    const copyBtn = screen.getByRole("button", { name: /copy LLM01 prompt/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(writeText).toHaveBeenCalledWith(llm01Prompt.prompt);
      expect(onPromptCopy).toHaveBeenCalledTimes(1);
      expect(onPromptCopy).toHaveBeenCalledWith("LLM01");
    });
  });

  it("copy JD button writes sample JD text and calls onSampleJdCopy", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const onSampleJdCopy = jest.fn();
    const { SAMPLE_JD_CLIPBOARD_TEXT } = await import("../lib/sampleJobDescription");

    renderWithAudience(
      <ValidationLab armedEggIds={new Set()} onSampleJdCopy={onSampleJdCopy} />
    );

    expandSampleJobDescription();
    const jdCopy = screen.getByRole("button", { name: /Copy sample job description/i });
    fireEvent.click(jdCopy);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(SAMPLE_JD_CLIPBOARD_TEXT);
      expect(onSampleJdCopy).toHaveBeenCalledTimes(1);
    });
  });

  it("when armedEggIds contains invisible-hand, LLM01 card shows match badge", () => {
    renderWithAudience(
      <ValidationLab armedEggIds={new Set(["invisible-hand"])} />
    );

    const matchBadge = screen.getByLabelText(matchBadgeAriaHr);
    expect(matchBadge).toBeInTheDocument();
    const llm01Card = screen.getByTestId("validation-prompt-LLM01");
    expect(llm01Card).toContainElement(matchBadge);
  });

  it("when armedEggIds is empty, no match badge is shown", () => {
    renderWithAudience(<ValidationLab armedEggIds={new Set()} />);

    expect(screen.queryByLabelText(matchBadgeAriaHr)).not.toBeInTheDocument();
  });

  it("when armedEggIds contains metadata-shadow, LLM02 card shows match badge", () => {
    renderWithAudience(
      <ValidationLab armedEggIds={new Set(["metadata-shadow"])} />
    );

    const matchBadge = screen.getByLabelText(matchBadgeAriaHr);
    const llm02Card = screen.getByTestId("validation-prompt-LLM02");
    expect(llm02Card).toContainElement(matchBadge);
  });

  it("when armedEggIds contains incident-mailto only, LLM02 card shows match badge", () => {
    renderWithAudience(
      <ValidationLab armedEggIds={new Set(["incident-mailto"])} />
    );

    const matchBadge = screen.getByLabelText(matchBadgeAriaHr);
    expect(screen.getByTestId("validation-prompt-LLM02")).toContainElement(matchBadge);
  });

  it("when armedEggIds contains canary-wing, LLM09 card shows match badge", () => {
    renderWithAudience(
      <ValidationLab armedEggIds={new Set(["canary-wing"])} />
    );

    const matchBadge = screen.getByLabelText(matchBadgeAriaHr);
    const llm09Card = screen.getByTestId("validation-prompt-LLM09");
    expect(llm09Card).toContainElement(matchBadge);
  });
});
