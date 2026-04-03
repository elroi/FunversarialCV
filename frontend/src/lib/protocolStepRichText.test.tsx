import React from "react";
import { render, screen } from "@testing-library/react";
import { ProtocolStepRichText, renderMarkdownInlineLinks } from "./protocolStepRichText";

describe("renderMarkdownInlineLinks", () => {
  it("renders plain text when there are no links", () => {
    const { container } = render(<>{renderMarkdownInlineLinks("hello world")}</>);
    expect(container).toHaveTextContent("hello world");
    expect(container.querySelector("a")).not.toBeInTheDocument();
  });

  it("renders a single markdown link", () => {
    render(<>{renderMarkdownInlineLinks("see [Claude](https://claude.ai/) now")}</>);
    const link = screen.getByRole("link", { name: "Claude" });
    expect(link).toHaveAttribute("href", "https://claude.ai/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("ProtocolStepRichText", () => {
  it("preserves line breaks across multiple lines", () => {
    const { container } = render(
      <ProtocolStepRichText text={"Line one.\nLine two."} />
    );
    const blocks = container.querySelectorAll("span.block");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toHaveTextContent("Line one.");
    expect(blocks[1]).toHaveTextContent("Line two.");
  });
});
