/**
 * Parses Validation Lab protocol copy: first block is the headline; following lines are numbered (1)…(n) steps.
 * Returns null if the shape is unexpected so callers can fall back to plain prose.
 */
export function parseValidationLabProtocol(protocol: string): {
  headline: string;
  steps: string[];
} | null {
  const chunks = protocol.split(/\n\n+/).map((c) => c.trim()).filter(Boolean);
  if (chunks.length < 2) return null;

  const headline = chunks[0].replace(/\s*:\s*$/, "").trim();
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
  return { headline, steps };
}
