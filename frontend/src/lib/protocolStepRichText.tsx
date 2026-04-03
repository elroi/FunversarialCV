import React from "react";

const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;

const linkClassName =
  "font-medium text-accent underline decoration-accent/45 underline-offset-2 hover:text-success focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded";

/**
 * Renders [label](https://url) segments as external links; other text is unchanged.
 * Used for Validation Lab protocol steps so copy can stay in locale strings.
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
    parts.push(
      <a
        key={key++}
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
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
