/**
 * Home page UX tests (TDD for success message, retry, clear file, aria).
 * fetch is mocked to control success/error responses.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "./page";
import * as ClientVault from "../src/lib/clientVault";
import * as ClientDocumentCreate from "../src/lib/clientDocumentCreate";
import * as ClientTokenReplace from "../src/lib/clientTokenReplaceInCopy";

const createFile = (name: string, type: string) =>
  new File(["dummy"], name, { type });

/** DOCX magic bytes (PK) so client magic-byte check accepts the file. */
const DOCX_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
function createDocxFile(name: string) {
  return new File([DOCX_MAGIC], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function mockFetchSuccess(originalName: string = "resume.docx") {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      bufferBase64: Buffer.from("fake-docx-bytes").toString("base64"),
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      originalName,
      scannerReport: { scan: { hasSuspiciousPatterns: false, matchedPatterns: [] } },
    }),
  });
}

function mockFetchError(message: string = "Processing failed.") {
  return jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: message }),
  });
}

describe("Home page", () => {
  const originalFetch = global.fetch;
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;

  beforeEach(() => {
    createObjectURL = jest.fn().mockReturnValue("blob:mock-url");
    revokeObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
    // In Jest, File.prototype.slice().arrayBuffer() may not resolve with correct bytes; mock so magic-byte check sees DOCX.
    const docxMagicBuffer = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer;
    jest.spyOn(File.prototype, "slice").mockImplementation(function (this: File) {
      return {
        arrayBuffer: () => Promise.resolve(docxMagicBuffer),
      } as unknown as Blob;
    });
  });

  describe("intro and resources nav", () => {
    it("renders a short intro paragraph explaining FunversarialCV and its stateless, OWASP-aligned model", () => {
      render(<Home />);
      expect(
        screen.getByText(/FunversarialCV is an educational tool/i)
      ).toBeInTheDocument();
      // The phrase \"processed in-memory only\" appears in multiple hints; we only
      // assert that at least one such explanation is present.
      const matches = screen.getAllByText(/processed in-memory only/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    it("includes a Resources link in the header that points to \\/resources", () => {
      render(<Home />);
      const link = screen.getByRole("link", { name: /resources/i });
      expect(link).toBeInTheDocument();
      expect((link as HTMLAnchorElement).getAttribute("href")).toBe("/resources");
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("shows the max file size hint matching the API limit", () => {
    render(<Home />);
    expect(
      screen.getByText(/Max 4 MB\. DOCX \(Word\) only\./i)
    ).toBeInTheDocument();
  });

  describe("success message after download", () => {
    it("shows success message with filename and Download button after successful harden", async () => {
      global.fetch = mockFetchSuccess("my-cv.docx");
      render(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("my-cv.docx")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });

      const hardenBtn = screen.getByRole("button", { name: /harden/i });
      fireEvent.click(hardenBtn);

      await waitFor(() => {
        expect(screen.getByText(/my-cv_final\.docx/i)).toBeInTheDocument();
      });

      const downloadBtn = screen.getByRole("button", { name: /download/i });
      expect(downloadBtn).toBeInTheDocument();
      fireEvent.click(downloadBtn);
      expect(createObjectURL).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe("client-side PII dehydration and rehydration wiring", () => {
    it("dehydrates in browser, rebuilds tokenized file, sends file, then rehydrates response", async () => {
      jest.spyOn(ClientTokenReplace, "replacePiiWithTokensInCopy").mockResolvedValue(null);

      const spyDehydrate = jest
        .spyOn(ClientVault, "dehydrateInBrowser")
        .mockResolvedValue({
          tokenizedBuffer: new TextEncoder().encode("Hello {{PII_EMAIL_0}}").buffer,
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          piiMap: {
            byToken: {
              "{{PII_EMAIL_0}}": {
                token: "{{PII_EMAIL_0}}",
                type: "EMAIL",
                value: "user@example.com",
              },
            },
          },
          tokenizedText: "Hello {{PII_EMAIL_0}}",
        } as never);

      jest
        .spyOn(ClientDocumentCreate, "createDocumentWithTextInBrowser")
        .mockResolvedValue(new ArrayBuffer(8));

      const spyRehydrate = jest
        .spyOn(ClientVault, "rehydrateInBrowser")
        .mockResolvedValue(new ArrayBuffer(0));

      global.fetch = mockFetchSuccess("my-cv.docx");

      render(<Home />);

      const input = screen.getByTestId("dropzone-input");
      const docxFile = createDocxFile("my-cv.docx");
      fireEvent.change(input, { target: { files: [docxFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /harden/i }));

      await waitFor(() => {
        expect(spyDehydrate).toHaveBeenCalledTimes(1);
      });

      expect(
        screen.getByText(/\[CLIENT\] Dehydrated PII in-browser,.+sending to server\./i)
      ).toBeInTheDocument();
      expect(ClientDocumentCreate.createDocumentWithTextInBrowser).toHaveBeenCalledWith(
        "Hello {{PII_EMAIL_0}}",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );

      await waitFor(() => {
        expect(spyRehydrate).toHaveBeenCalled();
      });
    });
  });

  describe("retry on error", () => {
    it("shows Retry button when processing fails and calls runHarden when clicked", async () => {
      let hardenCallCount = 0;
      const fetchMock: jest.MockedFunction<typeof global.fetch> = jest.fn(
        async (input: RequestInfo | URL) =>
          // Minimal Response-like shape for tests; cast for TS compatibility.
          ({
            ok: true,
            json: async () => ({ eggs: [] }),
          } as unknown as Response)
      );

      fetchMock.mockImplementationOnce(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
        if (url.includes("/api/eggs")) {
          return {
            ok: true,
            json: async () => ({ eggs: [] }),
          } as unknown as Response;
        }
        hardenCallCount++;
        if (hardenCallCount === 1) {
          return {
            ok: false,
            json: async () => ({ error: "Server error" }),
          } as unknown as Response;
        }
        return {
          ok: true,
          json: async () => ({
            bufferBase64: Buffer.from("x").toString("base64"),
            mimeType: "application/pdf",
            originalName: "resume.pdf",
            scannerReport: { scan: { hasSuspiciousPatterns: false, matchedPatterns: [] } },
          }),
        } as unknown as Response;
      });
      global.fetch = fetchMock;
      render(<Home />);

      const dropInput = screen.getByTestId("dropzone-input");
      fireEvent.change(dropInput, {
        target: { files: [createDocxFile("resume.docx")] },
      });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /harden/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /harden/i }));

      await waitFor(() => {
        expect(screen.getByText(/Alert:/i)).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      expect(retryBtn).toBeInTheDocument();
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(3); // /api/eggs + /api/harden (fail) + /api/harden (retry)
      });
    });
  });

  describe("clear / change file", () => {
    it("shows Clear file control when a file is selected and clears selection when clicked", async () => {
      render(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });

      const clearBtn = screen.getByRole("button", { name: /clear file|change file/i });
      expect(clearBtn).toBeInTheDocument();
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Armed CV:/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Drop your CV here/i)).toBeInTheDocument();
      });
    });
  });

  describe("Harden button accessibility", () => {
    it("Harden button has aria-label reflecting state (Harden vs processing)", async () => {
      let resolveFetch: (value: Response) => void;
      const fetchPromise: Promise<Response> = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      global.fetch = jest.fn().mockReturnValue(fetchPromise) as jest.MockedFunction<
        typeof global.fetch
      >;
      render(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });

      await waitFor(() => {
        const btn = screen.getByRole("button", { name: /harden/i });
        expect(btn).toHaveAttribute("aria-label", "Harden");
      });

      const hardenBtn = screen.getByRole("button", { name: /harden/i });
      fireEvent.click(hardenBtn);

      await waitFor(() => {
        const processingBtn = screen.getByRole("button", { name: /processing/i });
        expect(processingBtn).toBeDisabled();
        expect(processingBtn).toHaveAttribute("aria-label", "Harden (processing…)");
      });

      resolveFetch!({
        ok: true,
        json: async () => ({
          bufferBase64: Buffer.from("x").toString("base64"),
          mimeType: "application/pdf",
          originalName: "resume.pdf",
          scannerReport: { scan: { hasSuspiciousPatterns: false, matchedPatterns: [] } },
        }),
      } as unknown as Response);
    });
  });

  describe("egg-checkbox link", () => {
    it("disables config card when its egg is unchecked in Eggs to run", async () => {
      render(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });

      const invisibleHandCheckbox = screen.getByRole("checkbox", { name: /Invisible Hand/i });
      fireEvent.click(invisibleHandCheckbox);

      const trapTextarea = screen.getByPlaceholderText(/leave blank to use default/i);
      expect(trapTextarea).toBeDisabled();
    });
  });

  describe("checkbox localStorage persistence", () => {
    const STORAGE_KEY = "funversarialcv-checkboxes";

    beforeEach(() => {
      window.localStorage.removeItem(STORAGE_KEY);
    });

    afterEach(() => {
      window.localStorage.removeItem(STORAGE_KEY);
    });

    it("hydrates Preserve styles and Eggs to run from localStorage after mount", async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          enabledEggIds: ["invisible-hand", "canary-wing"],
          preserveStyles: true,
        })
      );
      render(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Eggs to run/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByRole("checkbox", { name: /preserve styles/i })).toBeChecked();
      });

      expect(screen.getByRole("checkbox", { name: /Invisible Hand/i })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: /Canary Wing/i })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: /Mailto Surprise/i })).not.toBeChecked();
      expect(screen.getByRole("checkbox", { name: /Metadata Shadow/i })).not.toBeChecked();
    });

    it("ignores invalid or unknown egg IDs from localStorage and falls back to defaults when none valid", async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          enabledEggIds: ["unknown-egg", "another-fake"],
          preserveStyles: false,
        })
      );
      render(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Eggs to run/i)).toBeInTheDocument();
      });

      expect(screen.getByRole("checkbox", { name: /Invisible Hand/i })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: /Mailto Surprise/i })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: /Canary Wing/i })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: /Metadata Shadow/i })).toBeChecked();
    });
  });

  describe("mobile UI (touch targets and layout)", () => {
    it("main wrapper has responsive padding classes for mobile", () => {
      render(<Home />);
      const main = document.getElementById("main-content");
      expect(main).toBeInTheDocument();
      const wrapper = main?.firstElementChild;
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass("px-4");
      expect(wrapper).toHaveClass("sm:px-6");
    });

    it("Change file button has 44px minimum touch target when file is selected", async () => {
      render(<Home />);
      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /clear file|change file/i })).toBeInTheDocument();
      });
      const changeFileBtn = screen.getByRole("button", { name: /clear file|change file/i });
      expect(changeFileBtn).toHaveClass("min-h-[44px]");
    });

    it("Download and Re-process buttons have 44px minimum touch target when hardened", async () => {
      global.fetch = mockFetchSuccess("out.docx");
      render(<Home />);
      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("cv.docx")] },
      });
      await waitFor(() => screen.getByRole("button", { name: /harden/i }));
      fireEvent.click(screen.getByRole("button", { name: /harden/i }));
      await waitFor(() => screen.getByRole("button", { name: /download/i }));
      const downloadBtn = screen.getByRole("button", { name: /download/i });
      const reprocessBtn = screen.getByRole("button", { name: /re-process/i });
      expect(downloadBtn).toHaveClass("min-h-[44px]");
      expect(reprocessBtn).toHaveClass("min-h-[44px]");
    });

    it("Retry button has 44px minimum touch target when error is shown", async () => {
      global.fetch = mockFetchError("Server error");
      render(<Home />);
      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("cv.docx")] },
      });
      await waitFor(() => screen.getByRole("button", { name: /harden/i }));
      fireEvent.click(screen.getByRole("button", { name: /harden/i }));
      await waitFor(() => screen.getByRole("button", { name: /retry/i }));
      const retryBtn = screen.getByRole("button", { name: /retry/i });
      expect(retryBtn).toHaveClass("min-h-[44px]");
    });

    it("Pipeline status toggle has touch-friendly minimum height", () => {
      render(<Home />);
      const toggle = screen.getByRole("button", { name: /pipeline status/i });
      expect(toggle).toHaveClass("min-h-[44px]");
    });

    it("egg checkbox labels have touch-friendly row padding", async () => {
      render(<Home />);
      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });
      await waitFor(() => screen.getByText(/Eggs to run/i));
      const label = screen.getByRole("checkbox", { name: /Invisible Hand/i }).closest("label");
      expect(label).toHaveClass("py-2");
    });

    it("scrolls focused element into view when harden succeeds", async () => {
      const scrollIntoViewMock = jest.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
      global.fetch = mockFetchSuccess("out.docx");
      render(<Home />);
      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("cv.docx")] },
      });
      await waitFor(() => screen.getByRole("button", { name: /harden/i }));
      fireEvent.click(screen.getByRole("button", { name: /harden/i }));
      await waitFor(() => screen.getByRole("button", { name: /download/i }));
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it("scrolls retry button into view when harden fails", async () => {
      const scrollIntoViewMock = jest.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
      global.fetch = mockFetchError("Failed");
      render(<Home />);
      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("cv.docx")] },
      });
      await waitFor(() => screen.getByRole("button", { name: /harden/i }));
      fireEvent.click(screen.getByRole("button", { name: /harden/i }));
      await waitFor(() => screen.getByRole("button", { name: /retry/i }));
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  describe("demo presets visual distinction", () => {
    it("styles Dirty presets with a distinct hazard accent compared to Clean presets", () => {
      render(<Home />);
      const cleanDocx = screen.getByRole("button", { name: /clean · docx/i });
      const dirtyDocx = screen.getByRole("button", { name: /dirty · docx/i });

      expect(cleanDocx).not.toHaveClass("border-amber-300/70");
      expect(dirtyDocx).toHaveClass("border-amber-300/70");
      expect(dirtyDocx).toHaveClass("border-dashed");
    });
  });

  describe("demo presets loading state", () => {
    it("shows a generating hint and disables preset buttons while a demo CV is loading", async () => {
      let resolveFetch: (value: Response) => void;
      const fetchPromise: Promise<Response> = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      global.fetch = jest.fn().mockReturnValue(fetchPromise) as jest.MockedFunction<
        typeof global.fetch
      >;

      render(<Home />);
      const cleanDocx = screen.getByRole("button", { name: /clean · docx/i });
      fireEvent.click(cleanDocx);

      await waitFor(() => {
        expect(
          screen.getByText(/Generating demo CV/i)
        ).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole("button", { name: /clean · docx|dirty · docx/i });
      buttons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });

      // Resolve fetch to avoid unhandled promise rejections in the test
      resolveFetch!({
        ok: true,
        json: async () => ({
          bufferBase64: Buffer.from("x").toString("base64"),
          mimeType: "application/pdf",
          originalName: "demo.pdf",
        }),
      } as unknown as Response);
    });
  });

  describe("Manual test list (automated coverage)", () => {
    describe("1. Layout and viewport", () => {
      it("main wrapper has max-width constraint to avoid horizontal scroll", () => {
        render(<Home />);
        const main = document.getElementById("main-content");
        const wrapper = main?.firstElementChild;
        expect(wrapper).toHaveClass("max-w-4xl");
      });

      it("main wrapper has responsive padding (px-4, sm:px-6)", () => {
        render(<Home />);
        const main = document.getElementById("main-content");
        const wrapper = main?.firstElementChild;
        expect(wrapper).toHaveClass("px-4");
        expect(wrapper).toHaveClass("sm:px-6");
      });
    });

    describe("2. Header", () => {
      it("header has flex-wrap so title and badge fit on narrow widths", () => {
        render(<Home />);
        const header = document.querySelector("header");
        expect(header).toHaveClass("flex-wrap");
      });

      it("Engine Online badge has shrink-0 so it does not overflow", () => {
        render(<Home />);
        const badge = screen.getByText("Engine Online");
        expect(badge).toHaveClass("shrink-0");
      });

      it("PII Mode and Engine Online text are present", () => {
        render(<Home />);
        expect(screen.getByText(/PII Mode: Stateless/i)).toBeInTheDocument();
        expect(screen.getByText("Engine Online")).toBeInTheDocument();
      });
    });

    describe("4. Pipeline status panel", () => {
      it("Pipeline status toggle is collapsed by default (aria-expanded false)", () => {
        render(<Home />);
        const toggle = screen.getByRole("button", { name: /pipeline status/i });
        expect(toggle).toHaveAttribute("aria-expanded", "false");
      });

      it("Pipeline status expands on click and collapses on second click", () => {
        render(<Home />);
        const toggle = screen.getByRole("button", { name: /pipeline status/i });
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "false");
      });
    });

    describe("6. Forms and inputs — egg config cards", () => {
      it("all four egg config cards are collapsed by default when file is selected", async () => {
        render(<Home />);
        const input = screen.getByTestId("dropzone-input");
        fireEvent.change(input, {
          target: { files: [createDocxFile("resume.docx")] },
        });
        await waitFor(() => screen.getByText(/Eggs to run/i));
        const invisibleHand = screen.getByRole("button", { name: /expand.*Invisible Hand/i });
        const incidentMailto = screen.getByRole("button", { name: /expand.*Mailto Surprise/i });
        const canaryWing = screen.getByRole("button", { name: /expand.*Canary Wing/i });
        const metadataShadow = screen.getByRole("button", { name: /expand.*Metadata Shadow/i });
        expect(invisibleHand).toHaveAttribute("aria-expanded", "false");
        expect(incidentMailto).toHaveAttribute("aria-expanded", "false");
        expect(canaryWing).toHaveAttribute("aria-expanded", "false");
        expect(metadataShadow).toHaveAttribute("aria-expanded", "false");
      });

      it("expanding Invisible Hand card shows trap text area", async () => {
        render(<Home />);
        const dropInput = screen.getByTestId("dropzone-input");
        fireEvent.change(dropInput, {
          target: { files: [createDocxFile("resume.docx")] },
        });
        await waitFor(() => screen.getByRole("button", { name: /expand.*Invisible Hand/i }));
        const trigger = screen.getByRole("button", { name: /expand.*Invisible Hand/i });
        fireEvent.click(trigger);
        expect(screen.getByPlaceholderText(/leave blank to use default/i)).toBeInTheDocument();
        expect(trigger).toHaveAttribute("aria-expanded", "true");
      });
    });

    describe("8. Focus and accessibility", () => {
      it("main content has id main-content for Skip to main content link target", () => {
        render(<Home />);
        expect(document.getElementById("main-content")).toBeInTheDocument();
      });
    });

    describe("9. Regression", () => {
      it("section has md:flex-row for two-column layout at desktop", () => {
        render(<Home />);
        const section = document.querySelector("main section");
        expect(section).toHaveClass("md:flex-row");
      });

      it("full flow: upload, harden, download", async () => {
        global.fetch = mockFetchSuccess("hardened-cv.docx");
        render(<Home />);
        fireEvent.change(screen.getByTestId("dropzone-input"), {
          target: { files: [createDocxFile("cv.docx")] },
        });
        await waitFor(() => screen.getByRole("button", { name: /harden/i }));
        fireEvent.click(screen.getByRole("button", { name: /harden/i }));
        await waitFor(() => screen.getByRole("button", { name: /download/i }));
        fireEvent.click(screen.getByRole("button", { name: /download/i }));
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });
    });
  });
});

