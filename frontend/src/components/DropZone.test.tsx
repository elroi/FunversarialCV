import React from "react";
import { fireEvent } from "@testing-library/react";
import { renderWithAudience } from "../test-utils";
import { DropZone } from "./DropZone";

function createFile(name: string, type: string) {
  return new File(["dummy"], name, { type });
}

describe("DropZone", () => {
  it("rejects a .pdf file and shows DOCX-only error", () => {
    const handleSelect = jest.fn();
    const { getByTestId, getByText } = renderWithAudience(<DropZone onFileSelect={handleSelect} />);

    const input = getByTestId("dropzone-input") as HTMLInputElement;
    const file = createFile("resume.pdf", "application/pdf");

    fireEvent.change(input, { target: { files: [file] } });

    expect(handleSelect).not.toHaveBeenCalled();
    expect(getByText(/only word documents \(\.docx\) are allowed/i)).toBeTruthy();
  });

  it("accepts a .docx file and calls onFileSelect", () => {
    const handleSelect = jest.fn();
    const { getByTestId } = renderWithAudience(<DropZone onFileSelect={handleSelect} />);

    const input = getByTestId("dropzone-input") as HTMLInputElement;
    const file = createFile(
      "resume.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    fireEvent.change(input, { target: { files: [file] } });

    expect(handleSelect).toHaveBeenCalledWith(file);
  });

  it("rejects unsupported file types and shows an error", () => {
    const handleSelect = jest.fn();
    const { getByTestId, getByText } = renderWithAudience(
      <DropZone onFileSelect={handleSelect} />
    );

    const input = getByTestId("dropzone-input") as HTMLInputElement;
    const file = createFile("image.png", "image/png");

    fireEvent.change(input, { target: { files: [file] } });

    expect(handleSelect).not.toHaveBeenCalled();
    expect(getByText(/only word documents \(\.docx\) are allowed/i)).toBeTruthy();
  });

  it("rejects files larger than maxSizeBytes and shows a size error", () => {
    const handleSelect = jest.fn();
    const { getByTestId, getByText } = renderWithAudience(
      <DropZone onFileSelect={handleSelect} maxSizeBytes={1} />
    );

    const input = getByTestId("dropzone-input") as HTMLInputElement;
    const file = createFile(
      "resume.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    fireEvent.change(input, { target: { files: [file] } });

    expect(handleSelect).not.toHaveBeenCalled();
    expect(getByText(/file is too large/i)).toBeTruthy();
  });
});

