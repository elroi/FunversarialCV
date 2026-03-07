/**
 * Home page UX tests (TDD for success message, retry, clear file, aria).
 * fetch is mocked to control success/error responses.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "./page";

const createFile = (name: string, type: string) =>
  new File(["dummy"], name, { type });

function mockFetchSuccess(originalName: string = "resume.pdf") {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      bufferBase64: Buffer.from("fake-pdf-bytes").toString("base64"),
      mimeType: "application/pdf",
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
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("success message after download", () => {
    it("shows success message with filename after successful harden", async () => {
      global.fetch = mockFetchSuccess("my-cv.pdf");
      render(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createFile("my-cv.pdf", "application/pdf")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Armed CV:/i)).toBeInTheDocument();
      });

      const hardenBtn = screen.getByRole("button", { name: /harden/i });
      fireEvent.click(hardenBtn);

      await waitFor(() => {
        expect(screen.getByText(/hardened.*my-cv\.pdf/i)).toBeInTheDocument();
      });
    });
  });

  describe("retry on error", () => {
    it("shows Retry button when processing fails and calls runHarden when clicked", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Server error" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            bufferBase64: Buffer.from("x").toString("base64"),
            mimeType: "application/pdf",
            originalName: "resume.pdf",
            scannerReport: { scan: { hasSuspiciousPatterns: false, matchedPatterns: [] } },
          }),
        });
      global.fetch = fetchMock;
      render(<Home />);

      const dropInput = screen.getByTestId("dropzone-input");
      fireEvent.change(dropInput, {
        target: { files: [createFile("resume.pdf", "application/pdf")] },
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
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("clear / change file", () => {
    it("shows Clear file control when a file is selected and clears selection when clicked", async () => {
      render(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createFile("resume.pdf", "application/pdf")] },
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
      let resolveFetch: (value: unknown) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
      global.fetch = jest.fn().mockReturnValue(fetchPromise);
      render(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createFile("resume.pdf", "application/pdf")] },
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
      });
    });
  });

  describe("egg-checkbox link", () => {
    it("disables config card when its egg is unchecked in Eggs to run", async () => {
      render(<Home />);

      const input = screen.getByTestId("dropzone-input");
      fireEvent.change(input, {
        target: { files: [createFile("resume.pdf", "application/pdf")] },
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
});
