import React from "react";
import { render, screen } from "@testing-library/react";
import { CheckAndValidateBlock } from "./CheckAndValidateBlock";

describe("CheckAndValidateBlock", () => {
  const fullContent =
    "Quick check: Open the PDF and press Ctrl+A. Manual check: In a PDF use Select All. Validation: Run the transform and verify.";

  it("renders Quick check, Manual check, and Egg validation as separate paragraphs with bold labels", () => {
    const { container } = render(<CheckAndValidateBlock content={fullContent} />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0].textContent).toMatch(/Quick check:.*Open the PDF and press Ctrl\+A/);
    expect(paragraphs[1].textContent).toMatch(/Manual check:.*In a PDF use Select All/);
    expect(paragraphs[2].textContent).toMatch(/Egg validation:.*Run the transform and verify/);
    const strongs = container.querySelectorAll("strong");
    expect(strongs).toHaveLength(3);
    expect(strongs[0].textContent).toBe("Quick check:");
    expect(strongs[1].textContent).toBe("Manual check:");
    expect(strongs[2].textContent).toBe("Egg validation:");
  });

  it("renders fallback when content is empty", () => {
    render(
      <CheckAndValidateBlock
        content=""
        fallback={<p data-testid="fallback">No instructions</p>}
      />
    );
    expect(screen.getByTestId("fallback")).toHaveTextContent("No instructions");
  });

  it("renders single paragraph when content has no Manual check / Validation labels", () => {
    render(<CheckAndValidateBlock content="Just one paragraph." />);
    expect(screen.getByText("Just one paragraph.")).toBeInTheDocument();
  });
});
