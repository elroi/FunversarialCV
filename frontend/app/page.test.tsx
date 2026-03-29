/**
 * Home page UX tests (TDD for success message, retry, clear file, aria).
 * fetch is mocked to control success/error responses.
 */
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithAudience } from "../src/test-utils";
import Home from "./page";
import * as ClientVault from "../src/lib/clientVault";
import * as ClientDocumentCreate from "../src/lib/clientDocumentCreate";
import * as ClientTokenReplace from "../src/lib/clientTokenReplaceInCopy";
import { buildStyledDemoCvDocx } from "../src/lib/demoCvBuilders";
import { MIME_DOCX } from "../src/engine/documentExtract";
import { securityCopy } from "../src/copy/security";

const createFile = (name: string, type: string) =>
  new File(["dummy"], name, { type });

/** DOCX magic bytes (PK) so client magic-byte check accepts the file. */
const DOCX_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
function createDocxFile(name: string) {
  return new File([DOCX_MAGIC], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

/**
 * Engine fold may auto-open after arming a CV; only click if still collapsed
 * so we never toggle it shut before Inject Eggs / egg tests.
 */
function ensureEngineConfigExpanded() {
  const btn = screen.getByRole("button", {
    name: /engine configuration: show or hide|how it runs: show or hide/i,
  });
  if (btn.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(btn);
  }
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
  const AUDIENCE_STORAGE_KEY = "funversarialcv-audience";
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;

  beforeEach(() => {
    window.localStorage.setItem(AUDIENCE_STORAGE_KEY, "security");
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
    // Magic-byte-only "DOCX" fixtures are not real ZIPs; real dehydration throws. Production blocks POST on dehydrate
    // failure — mock a successful path unless a test overrides these spies.
    jest.spyOn(ClientVault, "dehydrateInBrowser").mockResolvedValue({
      tokenizedBuffer: new TextEncoder().encode("test dehydrated body").buffer,
      mimeType: MIME_DOCX,
      piiMap: { byToken: {} },
      tokenizedText: "test dehydrated body",
    });
    jest.spyOn(ClientTokenReplace, "replacePiiWithTokensInCopy").mockImplementation(async (file: File) => {
      // Avoid file.arrayBuffer() in jsdom (can reject); slice is already mocked to return DOCX magic.
      const buf = await file.slice(0, 4).arrayBuffer();
      return { file, buffer: buf };
    });
  });

  describe("intro and resources nav", () => {
    it("renders intro with OWASP-aligned framing and authorized-use qualifier (security)", () => {
      renderWithAudience(<Home />);
      const main = screen.getByRole("main");
      const introText = main.textContent ?? "";
      expect(introText).toMatch(/OWASP-aligned/i);
      expect(introText).toMatch(/authorized testing and research only/i);
    });

    it("places HR intro above the input channel (DOM order)", async () => {
      window.localStorage.setItem(AUDIENCE_STORAGE_KEY, "hr");
      renderWithAudience(<Home />);
      const intro = await screen.findByText(
        /compare before-and-after results and learn how AI tools interpret the same CV under slightly different signal conditions/i
      );
      const inputChannelToggle = await screen.findByRole("button", {
        name: /upload your cv: show or hide/i,
      });
      expect(
        inputChannelToggle.compareDocumentPosition(intro) &
          Node.DOCUMENT_POSITION_PRECEDING
      ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    });

    it("places security intro lead above the input channel (DOM order)", async () => {
      window.localStorage.setItem(AUDIENCE_STORAGE_KEY, "security");
      renderWithAudience(<Home />);
      const lead = await screen.findByText((_content, element) => {
        const text = element?.textContent ?? "";
        return (
          element?.tagName === "P" &&
          /educational adversarial simulation/i.test(text) &&
          /hiring pipelines/i.test(text)
        );
      });
      const inputChannelToggle = await screen.findByRole("button", {
        name: /input channel: show or hide/i,
      });
      expect(
        inputChannelToggle.compareDocumentPosition(lead) &
          Node.DOCUMENT_POSITION_PRECEDING
      ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    });

    it("places How to run a fair test fold after HR intro and before Upload your CV (DOM order)", async () => {
      window.localStorage.setItem(AUDIENCE_STORAGE_KEY, "hr");
      renderWithAudience(<Home />);
      const intro = await screen.findByText(
        /compare before-and-after results and learn how AI tools interpret the same CV under slightly different signal conditions/i
      );
      const experimentFold = await screen.findByRole("button", {
        name: /how to run a fair test: show or hide steps/i,
      });
      const inputChannelToggle = await screen.findByRole("button", {
        name: /upload your cv: show or hide/i,
      });
      expect(
        experimentFold.compareDocumentPosition(intro) &
          Node.DOCUMENT_POSITION_PRECEDING
      ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
      expect(
        inputChannelToggle.compareDocumentPosition(experimentFold) &
          Node.DOCUMENT_POSITION_PRECEDING
      ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    });

    it("places How to run a fair test fold after security intro lead and before Input Channel (DOM order)", async () => {
      window.localStorage.setItem(AUDIENCE_STORAGE_KEY, "security");
      renderWithAudience(<Home />);
      const lead = await screen.findByText((_content, element) => {
        const text = element?.textContent ?? "";
        return (
          element?.tagName === "P" &&
          /educational adversarial simulation/i.test(text) &&
          /hiring pipelines/i.test(text)
        );
      });
      const experimentFold = await screen.findByRole("button", {
        name: /how to run a fair test: show or hide steps/i,
      });
      const inputChannelToggle = await screen.findByRole("button", {
        name: /input channel: show or hide/i,
      });
      expect(
        experimentFold.compareDocumentPosition(lead) &
          Node.DOCUMENT_POSITION_PRECEDING
      ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
      expect(
        inputChannelToggle.compareDocumentPosition(experimentFold) &
          Node.DOCUMENT_POSITION_PRECEDING
      ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    });

    it("places security intro detail (OWASP) after the input channel (DOM order)", async () => {
      window.localStorage.setItem(AUDIENCE_STORAGE_KEY, "security");
      renderWithAudience(<Home />);
      const detail = await screen.findByText(/OWASP-aligned/i);
      const inputChannelToggle = await screen.findByRole("button", {
        name: /input channel: show or hide/i,
      });
      expect(
        detail.compareDocumentPosition(inputChannelToggle) &
          Node.DOCUMENT_POSITION_PRECEDING
      ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    });

    it("renders positioning line inside experiment panel (expand collapsible)", () => {
      renderWithAudience(<Home />);
      fireEvent.click(
        screen.getByRole("button", { name: /how to run a fair test/i })
      );
      expect(screen.getByText(/controlled before\/after evaluation/i)).toBeInTheDocument();
      expect(screen.getByText(/model behavior shifts/i)).toBeInTheDocument();
    });

    it("renders philosophy line (breaking the model / inputs shape outcomes)", () => {
      renderWithAudience(<Home />);
      fireEvent.click(
        screen.getByRole("button", { name: /how to run a fair test/i })
      );
      expect(screen.getByText(/breaking the model/i)).toBeInTheDocument();
      expect(screen.getByText(/inputs shape outcomes/i)).toBeInTheDocument();
    });

    it("renders experiment steps inside collapsible (expand to show RUN THE CV EXPERIMENT)", () => {
      renderWithAudience(<Home />);
      const expand = screen.getByRole("button", {
        name: /how to run a fair test/i,
      });
      expect(expand).toBeInTheDocument();
      fireEvent.click(expand);
      expect(screen.getByText(/RUN THE CV EXPERIMENT/i)).toBeInTheDocument();
    });

    it("renders flow as numbered list with sample CV, inject, download, test, observe, confirm", () => {
      renderWithAudience(<Home />);
      fireEvent.click(
        screen.getByRole("button", { name: /how to run a fair test/i })
      );
      expect(screen.getByText(/Start with our sample CV/i)).toBeInTheDocument();
      expect(screen.getByText(/Inject adversarial layers/i)).toBeInTheDocument();
      expect(screen.getByText(/Download your .armed. CV/i)).toBeInTheDocument();
      expect(screen.getByText(/Test both versions against a real LLM/i)).toBeInTheDocument();
      expect(screen.getByText(/Observe differences in behavior/i)).toBeInTheDocument();
      expect(screen.getByText(/Confirm or reject the observed influence/i)).toBeInTheDocument();
      const list = document.querySelector("ol");
      expect(list).toBeInTheDocument();
      expect(list?.querySelectorAll("li")).toHaveLength(6);
    });

    it("includes a Resources link in the header that points to \\/resources", () => {
      renderWithAudience(<Home />);
      const link = screen.getByRole("link", { name: /resources/i });
      expect(link).toBeInTheDocument();
      expect((link as HTMLAnchorElement).getAttribute("href")).toBe("/resources");
    });

    it("Input Channel section is expanded by default", () => {
      renderWithAudience(<Home />);
      const btn = screen.getByRole("button", { name: /input channel: show or hide/i });
      expect(btn).toHaveAttribute("aria-expanded", "true");
    });

    it("renders Engine Configuration section fold collapsed by default; egg config when expanded", () => {
      renderWithAudience(<Home />);
      const engineBtn = screen.getByRole("button", {
        name: /engine configuration: show or hide/i,
      });
      expect(engineBtn).toHaveAttribute("aria-expanded", "false");
      ensureEngineConfigExpanded();
      expect(screen.getByText("Engine Configuration")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Choose which eggs to run, expand each to set payloads, then arm a CV and Inject Eggs/i
        )
      ).toBeInTheDocument();
      expect(screen.getAllByText(/The Invisible Hand/i).length).toBeGreaterThanOrEqual(1);
    });

    it("shows HR engine intro when How it runs is expanded and no CV is loaded", async () => {
      window.localStorage.setItem(AUDIENCE_STORAGE_KEY, "hr");
      renderWithAudience(<Home />);
      fireEvent.click(
        screen.getByRole("button", { name: /how it runs: show or hide/i })
      );
      expect(
        await screen.findByText(
          /Choose which signals to add, open each section to adjust details, then upload a CV and run Add signals/i
        )
      ).toBeInTheDocument();
    });

    it("renders Validation Lab collapsible and prompt rows (collapsed by default)", () => {
      renderWithAudience(<Home />);
      expect(
        screen.getByRole("button", { name: /validation lab: show or hide/i })
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: /validation lab: show or hide/i })
      );
      expect(screen.getByText("BASE-00")).toBeInTheDocument();
      expect(screen.getByTestId("validation-prompt-LLM01")).toBeInTheDocument();
    });

    it("does not emit duplicate-key warnings when copying the same validation prompt twice", async () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      renderWithAudience(<Home />);
      fireEvent.click(
        screen.getByRole("button", { name: /validation lab: show or hide/i })
      );
      fireEvent.click(
        screen.getByRole("button", {
          name: /Prompt LLM01: show or hide full text and copy control/i,
        })
      );

      const copyBtn = screen.getByRole("button", { name: /Copy LLM01 prompt/i });
      fireEvent.click(copyBtn);
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledTimes(2);
      });

      const duplicateKeyLogged = consoleError.mock.calls.some(
        (args) =>
          typeof args[0] === "string" &&
          args[0].includes("Encountered two children with the same key")
      );
      expect(duplicateKeyLogged).toBe(false);

      consoleError.mockRestore();
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("shows the max file size hint matching the API limit", () => {
    renderWithAudience(<Home />);
    expect(
      screen.getByText(/Max 4 MB\. DOCX \(Word\) only\./i)
    ).toBeInTheDocument();
  });

  describe("success message after download", () => {
    it("shows success message with filename and Download button after successful egg injection", async () => {
      global.fetch = mockFetchSuccess("my-cv.docx");
      renderWithAudience(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("my-cv.docx")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });

      ensureEngineConfigExpanded();

      expect(
        screen.getByText(/Expand each egg to set payloads, then click Inject Eggs/i)
      ).toBeInTheDocument();

      const injectBtn = screen.getByRole("button", { name: /inject eggs/i });
      fireEvent.click(injectBtn);

      await waitFor(() => {
        expect(screen.getByText(/my-cv_final\.docx/i)).toBeInTheDocument();
      });

      const downloadBtn = screen.getByRole("button", { name: /download/i });
      expect(downloadBtn).toBeInTheDocument();
      expect(screen.getByTestId("download-hardened-docx")).toHaveClass(
        "download-ready-pulse"
      );
      expect(screen.getByTestId("download-hardened-actions")).toHaveClass(
        "items-center"
      );
      expect(downloadBtn).toHaveClass("max-w-sm", "!min-h-[48px]");

      const injectAfterSuccess = screen.getByRole("button", { name: /inject eggs/i });
      expect(injectAfterSuccess).toBeDisabled();
      expect(injectAfterSuccess).toHaveAttribute(
        "aria-label",
        securityCopy.hardenAriaAwaitingConfigChange
      );
      expect(screen.queryByRole("button", { name: /re-process/i })).not.toBeInTheDocument();
      expect(
        screen.queryByText(securityCopy.downloadStaleConfigWarning)
      ).not.toBeInTheDocument();

      fireEvent.click(downloadBtn);
      expect(createObjectURL).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalled();
    });

    it("does not pulse Download when inject completes with no eggs selected (scan only)", async () => {
      global.fetch = mockFetchSuccess("scan-only.docx");
      renderWithAudience(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("scan-only.docx")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });

      ensureEngineConfigExpanded();

      for (const rx of [
        /Invisible Hand/i,
        /Mailto Surprise/i,
        /Canary Wing/i,
        /Metadata Shadow/i,
      ]) {
        const box = screen.getByRole("checkbox", { name: rx });
        if ((box as HTMLInputElement).checked) {
          fireEvent.click(box);
        }
      }

      fireEvent.click(screen.getByRole("button", { name: /inject eggs/i }));

      await waitFor(() => {
        expect(screen.getByText(/Scan complete/i)).toBeInTheDocument();
      });

      expect(screen.getByTestId("download-hardened-docx")).not.toHaveClass(
        "download-ready-pulse"
      );
      expect(screen.getByTestId("download-hardened-actions")).toHaveClass(
        "flex-wrap"
      );
      expect(screen.getByTestId("download-hardened-actions")).not.toHaveClass(
        "items-center"
      );
      expect(screen.getByTestId("download-hardened-docx")).not.toHaveClass(
        "max-w-sm"
      );
    });

    it("does not show stale download warning when the server fills canaryTokenUsed after inject", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          bufferBase64: Buffer.from("fake-docx-bytes").toString("base64"),
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          originalName: "my-cv.docx",
          canaryTokenUsed: "server-assigned-token-abc",
          scannerReport: { scan: { hasSuspiciousPatterns: false, matchedPatterns: [] } },
        }),
      });
      renderWithAudience(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("my-cv.docx")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });

      ensureEngineConfigExpanded();

      fireEvent.click(screen.getByRole("button", { name: /inject eggs/i }));

      await waitFor(() => {
        expect(screen.getByText(/my-cv_final\.docx/i)).toBeInTheDocument();
      });

      expect(
        screen.queryByText(securityCopy.downloadStaleConfigWarning)
      ).not.toBeInTheDocument();
    });

    it("re-enables Inject Eggs after egg selection changes post-success", async () => {
      global.fetch = mockFetchSuccess("my-cv.docx");
      renderWithAudience(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("my-cv.docx")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });
      ensureEngineConfigExpanded();

      fireEvent.click(screen.getByRole("button", { name: /inject eggs/i }));

      await waitFor(() => {
        expect(screen.getByText(/my-cv_final\.docx/i)).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /inject eggs/i })).toBeDisabled();
      expect(
        screen.queryByText(securityCopy.downloadStaleConfigWarning)
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("checkbox", { name: /Canary Wing/i }));

      expect(
        screen.getByText(securityCopy.downloadStaleConfigWarning)
      ).toBeInTheDocument();
      const downloadBtn = screen.getByRole("button", { name: /download/i });
      expect(downloadBtn).toHaveAttribute("aria-describedby", "download-stale-hint");

      const injectEnabled = screen.getByRole("button", { name: /inject eggs/i });
      expect(injectEnabled).not.toBeDisabled();
      expect(injectEnabled).toHaveAttribute("aria-label", securityCopy.hardenAriaDefault);
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

      renderWithAudience(<Home />);

      const input = screen.getByTestId("dropzone-input");
      const docxFile = createDocxFile("my-cv.docx");
      fireEvent.change(input, { target: { files: [docxFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });

      ensureEngineConfigExpanded();

      fireEvent.click(screen.getByRole("button", { name: /inject eggs/i }));

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
    it("shows Retry button when processing fails and calls egg injection again when clicked", async () => {
      let hardenAttempt = 0;
      const fetchMock: jest.MockedFunction<typeof global.fetch> = jest.fn(
        async (input: RequestInfo | URL) => {
          const url =
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.href
                : (input as Request).url;
          if (url.includes("/api/eggs")) {
            return {
              ok: true,
              json: async () => ({ eggs: [] }),
            } as unknown as Response;
          }
          if (url.includes("/api/harden")) {
            hardenAttempt += 1;
            if (hardenAttempt === 1) {
              return {
                ok: false,
                json: async () => ({ error: "Server error" }),
              } as unknown as Response;
            }
            return {
              ok: true,
              json: async () => ({
                bufferBase64: Buffer.from("x").toString("base64"),
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                originalName: "resume.docx",
                scannerReport: { scan: { hasSuspiciousPatterns: false, matchedPatterns: [] } },
              }),
            } as unknown as Response;
          }
          return { ok: true, json: async () => ({}) } as unknown as Response;
        }
      );
      global.fetch = fetchMock;
      renderWithAudience(<Home />);

      const dropInput = screen.getByTestId("dropzone-input");
      fireEvent.change(dropInput, {
        target: { files: [createDocxFile("resume.docx")] },
      });

      ensureEngineConfigExpanded();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /inject eggs/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /inject eggs/i }));

      await waitFor(() => {
        expect(screen.getByText(/Alert:/i)).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      expect(retryBtn).toBeInTheDocument();
      fireEvent.click(retryBtn);

      await waitFor(() => {
        const hardenCalls = fetchMock.mock.calls.filter((c) => {
          const input = c[0] as RequestInfo | URL;
          const url =
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.href
                : (input as Request).url;
          return url.includes("/api/harden");
        });
        expect(hardenCalls.length).toBe(2); // fail + retry
      });
    });
  });

  describe("clear / change file", () => {
    it("shows Clear file control when a file is selected and clears selection when clicked", async () => {
      renderWithAudience(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });

      ensureEngineConfigExpanded();

      const clearBtn = screen.getByRole("button", { name: /clear file|change file/i });
      expect(clearBtn).toBeInTheDocument();
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Armed CV:/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Drop your CV here/i)).toBeInTheDocument();
      });
    });
  });

  describe("Inject Eggs button accessibility", () => {
    it("Inject Eggs button has aria-label reflecting state (default vs injecting)", async () => {
      let resolveHarden: (value: Response) => void;
      const hardenPromise: Promise<Response> = new Promise((resolve) => {
        resolveHarden = resolve;
      });
      const fetchMock: jest.MockedFunction<typeof global.fetch> = jest.fn(
        async (input: RequestInfo | URL) => {
          const url =
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.href
                : (input as Request).url;
          if (url.includes("/api/eggs")) {
            return {
              ok: true,
              json: async () => ({ eggs: [] }),
            } as unknown as Response;
          }
          if (url.includes("/api/harden")) {
            return hardenPromise;
          }
          return { ok: true, json: async () => ({}) } as unknown as Response;
        }
      );
      global.fetch = fetchMock;
      renderWithAudience(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });

      ensureEngineConfigExpanded();

      await waitFor(() => {
        const btn = screen.getByRole("button", { name: /inject eggs/i });
        expect(btn).toHaveAttribute("aria-label", "Inject Eggs");
      });

      const injectBtn = screen.getByRole("button", { name: /inject eggs/i });
      fireEvent.click(injectBtn);

      await waitFor(() => {
        const processingBtn = screen.getByRole("button", { name: /injecting/i });
        expect(processingBtn).toBeDisabled();
        expect(processingBtn).toHaveAttribute("aria-label", "Inject Eggs (injecting…)");
      });

      resolveHarden!({
        ok: true,
        json: async () => ({
          bufferBase64: Buffer.from("x").toString("base64"),
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          originalName: "resume.docx",
          scannerReport: { scan: { hasSuspiciousPatterns: false, matchedPatterns: [] } },
        }),
      } as unknown as Response);

      await waitFor(() => {
        const doneBtn = screen.getByRole("button", { name: /inject eggs/i });
        expect(doneBtn).toBeDisabled();
        expect(doneBtn).toHaveAttribute(
          "aria-label",
          securityCopy.hardenAriaAwaitingConfigChange
        );
      });
    });
  });

  describe("egg-checkbox link", () => {
    it("disables config card when its egg is unchecked in Eggs to run", async () => {
      renderWithAudience(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });

      ensureEngineConfigExpanded();

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
      renderWithAudience(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });

      ensureEngineConfigExpanded();

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
      renderWithAudience(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });

      ensureEngineConfigExpanded();

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
      renderWithAudience(<Home />);
      const main = document.getElementById("main-content");
      expect(main).toBeInTheDocument();
      const wrapper = main?.firstElementChild;
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass("px-4");
      expect(wrapper).toHaveClass("sm:px-6");
    });

    it("Change file button has 44px minimum touch target when file is selected", async () => {
      renderWithAudience(<Home />);
      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });
      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });
      ensureEngineConfigExpanded();
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /clear file|change file/i })).toBeInTheDocument();
      });
      const changeFileBtn = screen.getByRole("button", { name: /clear file|change file/i });
      expect(changeFileBtn).toHaveClass("min-h-[44px]");
    });

    it("Download and gated Inject Eggs meet touch target after egg injection (48px download)", async () => {
      global.fetch = mockFetchSuccess("out.docx");
      renderWithAudience(<Home />);
      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("cv.docx")] },
      });
      await waitFor(() => screen.getByText(/Armed CV:/i));
      ensureEngineConfigExpanded();
      await waitFor(() => screen.getByRole("button", { name: /inject eggs/i }));
      fireEvent.click(screen.getByRole("button", { name: /inject eggs/i }));
      await waitFor(() => screen.getByRole("button", { name: /download/i }));
      const downloadBtn = screen.getByRole("button", { name: /download/i });
      const injectBtn = screen.getByRole("button", { name: /inject eggs/i });
      expect(downloadBtn).toHaveClass("!min-h-[48px]");
      expect(injectBtn).toHaveClass("min-h-[44px]");
    });

    it("Retry button has 44px minimum touch target when error is shown", async () => {
      global.fetch = mockFetchError("Server error");
      renderWithAudience(<Home />);
      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("cv.docx")] },
      });
      await waitFor(() => screen.getByText(/Armed CV:/i));
      ensureEngineConfigExpanded();
      await waitFor(() => screen.getByRole("button", { name: /inject eggs/i }));
      fireEvent.click(screen.getByRole("button", { name: /inject eggs/i }));
      await waitFor(() => screen.getByRole("button", { name: /retry/i }));
      const retryBtn = screen.getByRole("button", { name: /retry/i });
      expect(retryBtn).toHaveClass("min-h-[44px]");
    });

    it("Pipeline status section fold has touch-friendly minimum height", () => {
      renderWithAudience(<Home />);
      const toggle = screen.getByRole("button", {
        name: /pipeline status: show or hide|processing steps: show or hide/i,
      });
      expect(toggle).toHaveClass("min-h-10");
    });

    it("egg checkbox labels have touch-friendly row padding", async () => {
      renderWithAudience(<Home />);
      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("resume.docx")] },
      });
      await waitFor(() => screen.getByText(/Armed CV:/i));
      ensureEngineConfigExpanded();
      await waitFor(() => screen.getByText(/Eggs to run/i));
      const label = screen.getByRole("checkbox", { name: /Invisible Hand/i }).closest("label");
      expect(label).toHaveClass("py-2");
    });

    it("scrolls focused element into view when egg injection succeeds", async () => {
      const scrollIntoViewMock = jest.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
      global.fetch = mockFetchSuccess("out.docx");
      renderWithAudience(<Home />);
      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("cv.docx")] },
      });
      await waitFor(() => screen.getByText(/Armed CV:/i));
      ensureEngineConfigExpanded();
      await waitFor(() => screen.getByRole("button", { name: /inject eggs/i }));
      fireEvent.click(screen.getByRole("button", { name: /inject eggs/i }));
      await waitFor(() => screen.getByRole("button", { name: /download/i }));
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it("scrolls retry button into view when egg injection fails", async () => {
      const scrollIntoViewMock = jest.fn();
      HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
      global.fetch = mockFetchError("Failed");
      renderWithAudience(<Home />);
      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createDocxFile("cv.docx")] },
      });
      await waitFor(() => screen.getByText(/Armed CV:/i));
      ensureEngineConfigExpanded();
      await waitFor(() => screen.getByRole("button", { name: /inject eggs/i }));
      fireEvent.click(screen.getByRole("button", { name: /inject eggs/i }));
      await waitFor(() => screen.getByRole("button", { name: /retry/i }));
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  describe("demo presets visual distinction", () => {
    it("styles Dirty presets with a distinct hazard accent compared to Clean presets", () => {
      renderWithAudience(<Home />);
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

      renderWithAudience(<Home />);
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

    it("arms the engine when Clean · DOCX returns a real docx buffer from the API", async () => {
      const buffer = await buildStyledDemoCvDocx("clean");
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          bufferBase64: Buffer.from(buffer).toString("base64"),
          mimeType: MIME_DOCX,
          originalName: "FunversarialCV-demo-clean.docx",
        }),
      } as unknown as Response);

      renderWithAudience(<Home />);
      fireEvent.click(screen.getByRole("button", { name: /clean · docx/i }));

      await waitFor(() => {
        expect(screen.getByText(/CV loaded:|Armed CV:/i)).toBeInTheDocument();
      });
    });
  });

  describe("Manual test list (automated coverage)", () => {
    describe("1. Layout and viewport", () => {
      it("main wrapper has max-width constraint to avoid horizontal scroll", () => {
        renderWithAudience(<Home />);
        const main = document.getElementById("main-content");
        const wrapper = main?.firstElementChild;
        expect(wrapper).toHaveClass("max-w-5xl");
      });

      it("main wrapper has responsive padding (px-4, sm:px-6)", () => {
        renderWithAudience(<Home />);
        const main = document.getElementById("main-content");
        const wrapper = main?.firstElementChild;
        expect(wrapper).toHaveClass("px-4");
        expect(wrapper).toHaveClass("sm:px-6");
      });
    });

    describe("2. Header", () => {
      it("header has flex-wrap so title and nav link fit on narrow widths", () => {
        renderWithAudience(<Home />);
        const header = document.querySelector("header");
        expect(header).toHaveClass("flex-wrap");
      });

      it("Resources appears as a header link (not a pill next to a status badge)", () => {
        renderWithAudience(<Home />);
        const link = screen.getByRole("link", { name: /resources/i });
        expect(link.closest("header")).toBeTruthy();
        expect(screen.queryByText("Engine Online")).not.toBeInTheDocument();
      });

      it("security trust badge appears in the top toolbar", () => {
        renderWithAudience(<Home />);
        expect(screen.getByText(/PII · client vault/i)).toBeInTheDocument();
      });
    });

    describe("4. Pipeline status panel", () => {
      it("Pipeline status section is expanded by default (aria-expanded true)", () => {
        renderWithAudience(<Home />);
        const toggle = screen.getByRole("button", {
          name: /pipeline status: show or hide|processing steps: show or hide/i,
        });
        expect(toggle).toHaveAttribute("aria-expanded", "true");
      });

      it("Pipeline status collapses on click and expands on second click", () => {
        renderWithAudience(<Home />);
        const toggle = screen.getByRole("button", {
          name: /pipeline status: show or hide|processing steps: show or hide/i,
        });
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
      });
    });

    describe("6. Forms and inputs — egg config cards", () => {
      it("all four egg config cards are collapsed by default when file is selected", async () => {
        renderWithAudience(<Home />);
        const input = screen.getByTestId("dropzone-input");
        fireEvent.change(input, {
          target: { files: [createDocxFile("resume.docx")] },
        });
        await waitFor(() => screen.getByText(/Armed CV:/i));
        ensureEngineConfigExpanded();
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
        renderWithAudience(<Home />);
        const dropInput = screen.getByTestId("dropzone-input");
        fireEvent.change(dropInput, {
          target: { files: [createDocxFile("resume.docx")] },
        });
        await waitFor(() => screen.getByText(/Armed CV:/i));
        ensureEngineConfigExpanded();
        await waitFor(() => screen.getByRole("button", { name: /expand.*Invisible Hand/i }));
        const trigger = screen.getByRole("button", { name: /expand.*Invisible Hand/i });
        fireEvent.click(trigger);
        expect(screen.getByPlaceholderText(/leave blank to use default/i)).toBeInTheDocument();
        expect(trigger).toHaveAttribute("aria-expanded", "true");
      });
    });

    describe("8. Focus and accessibility", () => {
      it("main content has id main-content for Skip to main content link target", () => {
        renderWithAudience(<Home />);
        expect(document.getElementById("main-content")).toBeInTheDocument();
      });
    });

    describe("9. Regression", () => {
      it("section has md:flex-row for two-column layout at desktop", () => {
        renderWithAudience(<Home />);
        const section = document.querySelector("main section");
        expect(section).toHaveClass("md:flex-row");
      });

      it("full flow: upload, inject eggs, download", async () => {
        global.fetch = mockFetchSuccess("hardened-cv.docx");
        renderWithAudience(<Home />);
        fireEvent.change(screen.getByTestId("dropzone-input"), {
          target: { files: [createDocxFile("cv.docx")] },
        });
        await waitFor(() => screen.getByText(/Armed CV:/i));
        ensureEngineConfigExpanded();
        await waitFor(() => screen.getByRole("button", { name: /inject eggs/i }));
        fireEvent.click(screen.getByRole("button", { name: /inject eggs/i }));
        await waitFor(() => screen.getByRole("button", { name: /download/i }));
        fireEvent.click(screen.getByRole("button", { name: /download/i }));
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });
    });
  });
});

