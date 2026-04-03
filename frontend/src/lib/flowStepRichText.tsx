import React from "react";

/** Inline links in fair-test `flowSteps`: `[label](https://...)` or `[label](#anchor)`. */
const INLINE_LINK = /\[([^\]]+)\]\((https?:\/\/[^)]+|#[^)]+)\)/g;

const linkClassName =
  "font-medium text-accent underline decoration-accent/45 underline-offset-2 hover:text-success focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded";

/**
 * Renders optional markdown-style links inside a single flow-step line (experiment panel).
 */
export function renderFlowStepLine(line: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(INLINE_LINK.source, "g");
  let key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      parts.push(line.slice(last, m.index));
    }
    const href = m[2]!;
    const isExternal = href.startsWith("http");
    parts.push(
      <a
        key={key++}
        href={href}
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={linkClassName}
      >
        {m[1]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < line.length) {
    parts.push(line.slice(last));
  }
  return parts.length > 0 ? <>{parts}</> : line;
}
