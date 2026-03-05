import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { DropZone } from "./DropZone";

function createFile(name: string, type: string) {
  return new File(["dummy"], name, { type });
}

describe("DropZone", () => {
  it("accepts a .pdf file and calls onFileSelect", () => {
    const handleSelect = jest.fn();
    const { getByTestId } = render(<DropZone onFileSelect={handleSelect} />);

    const input = getByTestId("dropzone-input") as HTMLInputElement;
    const file = createFile("resume.pdf", "application/pdf");

    fireEvent.change(input, { target: { files: [file] } });

    expect(handleSelect).toHaveBeenCalledWith(file);
  });

  it("accepts a .docx file and calls onFileSelect", () => {
    const handleSelect = jest.fn();
    const { getByTestId } = render(<DropZone onFileSelect={handleSelect} />);

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
    const { getByTestId, getByText } = render(
      <DropZone onFileSelect={handleSelect} />
    );

    const input = getByTestId("dropzone-input") as HTMLInputElement;
    const file = createFile("image.png", "image/png");

    fireEvent.change(input, { target: { files: [file] } });

    expect(handleSelect).not.toHaveBeenCalled();
    expect(getByText(/only \.pdf and \.docx files are allowed/i)).toBeTruthy();
  });
});

