import React from "react";

/** Markdown-style [label](href); href may be https or same-page #fragment (see isSafeInternalHref). */
const MD_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

const linkClassName =
  "font-medium text-accent underline decoration-accent/45 underline-offset-2 hover:text-success focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded";

function isExternalHttpHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

/**
 * Same-page targets only: #id or /#id (app root). Rejects javascript:, data:, etc.
 * IDs match HTML id naming used in page.tsx / Validation Lab anchors.
 */
export function isSafeInternalHref(href: string): boolean {
  const h = href.trim();
  // HTML id: letter start, then letters, digits, underscore, hyphen (hyphen is not in \w).
  const idTail = "[a-zA-Z0-9_-]*";
  if (h.startsWith("#")) {
    return new RegExp(`^#[a-zA-Z]${idTail}$`).test(h);
  }
  if (h.startsWith("/#")) {
    return new RegExp(`^\/#[a-zA-Z]${idTail}$`).test(h);
  }
  return false;
}

/**
 * Renders [label](url) segments: external http(s) links open in a new tab;
 * safe internal #fragment and /#fragment links stay in-page (no target=_blank).
 * Other text is unchanged.
 */
export function renderMarkdownInlineLinks(line: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(MD_LINK.source, "g");
  let key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      parts.push(line.slice(last, m.index));
    }
    const label = m[1]!;
    const href = m[2]!.trim();
    if (isExternalHttpHref(href)) {
      parts.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {label}
        </a>
      );
    } else if (isSafeInternalHref(href)) {
      parts.push(
        <a key={key++} href={href} className={linkClassName}>
          {label}
        </a>
      );
    } else {
      parts.push(m[0]);
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) {
    parts.push(line.slice(last));
  }
  return parts.length > 0 ? <>{parts}</> : line;
}

/** Multi-line protocol step: newlines preserved; each line may contain inline markdown links. */
export function ProtocolStepRichText({ text }: { text: string }): React.ReactElement {
  const lines = text.split("\n");
  return (
    <span className="min-w-0 flex flex-col gap-0 pt-1">
      {lines.map((line, i) => (
        <span key={i} className="block">
          {renderMarkdownInlineLinks(line)}
        </span>
      ))}
    </span>
  );
}
