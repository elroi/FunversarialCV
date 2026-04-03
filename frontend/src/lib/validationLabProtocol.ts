/**
 * Splits the first protocol block into a short title, optional em-dash subtitle, and body copy.
 * Line 1 = title; line 2 if it starts with an em/en dash = subtitle (dash stripped); rest = description.
 */
export function splitValidationLabProtocolHeadline(headlineBlock: string): {
  title: string;
  subtitle: string | null;
  description: string | null;
} {
  const cleaned = headlineBlock.replace(/\s*:\s*$/, "").trim();
  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { title: cleaned, subtitle: null, description: null };
  }
  const title = lines[0]!;
  let subtitle: string | null = null;
  let descStart = 1;
  if (lines.length > 1 && /^[—–-]\s*/.test(lines[1]!)) {
    subtitle = lines[1]!.replace(/^[—–-]\s*/, "").trim();
    descStart = 2;
  }
  const description =
    descStart < lines.length ? lines.slice(descStart).join("\n\n").trim() : null;
  return { title, subtitle, description };
}

/**
 * Parses Validation Lab protocol copy: first block is the headline; following lines are numbered (1)…(n) steps.
 * Returns null if the shape is unexpected so callers can fall back to plain prose.
 */
export function parseValidationLabProtocol(protocol: string): {
  /** Full first block (title + subtitle + description); useful for tests and fallbacks. */
  headline: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  steps: string[];
} | null {
  const chunks = protocol.split(/\n\n+/).map((c) => c.trim()).filter(Boolean);
  if (chunks.length < 2) return null;

  const headline = chunks[0].replace(/\s*:\s*$/, "").trim();
  const { title, subtitle, description } = splitValidationLabProtocolHeadline(headline);
  const body = chunks.slice(1).join("\n\n").trim();
  const rawLines = body.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const steps: string[] = [];

  for (const line of rawLines) {
    const m = line.match(/^\((\d+)\)\s*(.+)$/);
    if (m) {
      steps.push(m[2].trim());
    } else if (steps.length > 0) {
      // Continuation lines render as line breaks in the UI (see ValidationLab whitespace-pre-line).
      steps[steps.length - 1] = `${steps[steps.length - 1]}\n${line}`.trim();
    }
  }

  if (steps.length === 0) return null;
  return { headline, title, subtitle, description, steps };
}
