import React from "react";
import { render, screen } from "@testing-library/react";
import {
  ProtocolStepRichText,
  isSafeInternalHref,
  renderMarkdownInlineLinks,
} from "./protocolStepRichText";

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

  it("renders same-page fragment links without target=_blank", () => {
    render(<>{renderMarkdownInlineLinks("go [upload](#console-cv-upload)")}</>);
    const link = screen.getByRole("link", { name: "upload" });
    expect(link).toHaveAttribute("href", "#console-cv-upload");
    expect(link).not.toHaveAttribute("target");
  });

  it("renders root-relative hash links for same-page navigation", () => {
    render(<>{renderMarkdownInlineLinks("[Inject](/#console-inject-eggs)")}</>);
    const link = screen.getByRole("link", { name: "Inject" });
    expect(link).toHaveAttribute("href", "/#console-inject-eggs");
    expect(link).not.toHaveAttribute("target");
  });

  it("leaves unsafe pseudo-protocol hrefs as literal text", () => {
    const { container } = render(
      <>{renderMarkdownInlineLinks("bad [x](javascript:alert(1))")}</>
    );
    expect(container).toHaveTextContent("bad [x](javascript:alert(1))");
    expect(container.querySelector("a")).not.toBeInTheDocument();
  });
});

describe("isSafeInternalHref", () => {
  it("accepts #id and /#id including hyphenated anchors", () => {
    expect(isSafeInternalHref("#console-cv-upload")).toBe(true);
    expect(isSafeInternalHref("/#validation-lab-harness")).toBe(true);
  });
  it("rejects empty hash, spaces in id, and javascript", () => {
    expect(isSafeInternalHref("#")).toBe(false);
    expect(isSafeInternalHref("#bad id")).toBe(false);
    expect(isSafeInternalHref("javascript:void(0)")).toBe(false);
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
