/**
 * Styled demo CV builders: produce DOCX and PDF with headings, bullets, and emphasis
 * instead of raw plain text. Used by GET /api/demo-cv.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ExternalHyperlink,
} from "docx";
import { PDFDocument, StandardFonts, rgb, PDFName, PDFString } from "pdf-lib";
import {
  DEMO_CV_SECTIONS,
  type DemoVariant,
  type DemoSection,
  type DemoFragment,
} from "./demoCvContent";

function buildRunsForFragment(fragment: DemoFragment): (TextRun | ExternalHyperlink)[] {
  if (!fragment.links || fragment.links.length === 0) {
    return [new TextRun({ text: fragment.text })];
  }

  const runs: (TextRun | ExternalHyperlink)[] = [];
  let remaining = fragment.text;

  for (const link of fragment.links) {
    const idx = remaining.indexOf(link.label);
    if (idx === -1) {
      continue;
    }
    const before = remaining.slice(0, idx);
    if (before) {
      runs.push(new TextRun({ text: before }));
    }
    runs.push(
      new ExternalHyperlink({
        link: link.href,
        children: [
          new TextRun({
            text: link.label,
            style: "Hyperlink",
          }),
        ],
      })
    );
    remaining = remaining.slice(idx + link.label.length);
  }

  if (remaining) {
    runs.push(new TextRun({ text: remaining }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text: fragment.text })];
}

function getFragmentsForVariant(
  section: DemoSection,
  variant: DemoVariant
): DemoFragment[] {
  return section.fragments.filter((f) =>
    variant === "clean"
      ? f.modes.includes("visible_clean")
      : f.modes.includes("visible_clean") || f.modes.includes("visible_dirty_only")
  );
}

/**
 * Builds a styled DOCX buffer for the demo CV (headings, bullets, bold where appropriate).
 */
export async function buildStyledDemoCvDocx(
  variant: DemoVariant
): Promise<Buffer> {
  const children: Paragraph[] = [];

  for (const section of DEMO_CV_SECTIONS) {
    const fragments = getFragmentsForVariant(section, variant);
    if (fragments.length === 0) continue;

    const isHeader = section.id === "header";
    const isSummary = section.id === "summary";
    const useBullets =
      !isHeader &&
      !isSummary &&
      (section.id === "skills" ||
        section.id.startsWith("experience") ||
        section.id === "education" ||
        section.id === "certifications" ||
        section.id === "publications" ||
        section.id === "projects" ||
        section.id === "interests");

    if (isHeader) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: fragments[0]?.text ?? "",
              bold: true,
              size: 28,
            }),
          ],
          heading: HeadingLevel.TITLE,
        })
      );
      if (fragments[1]) {
        children.push(
          new Paragraph({
            children: buildRunsForFragment(fragments[1]),
          })
        );
      }
      continue;
    }

    children.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_2,
      })
    );

    for (const frag of fragments) {
      const isRoleHeader =
        section.id.startsWith("experience") &&
        (frag.id.endsWith("_header") || frag.id.endsWith("_past_header"));
      if (isRoleHeader) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: frag.text, bold: true })],
          })
        );
      } else if (useBullets) {
        children.push(
          new Paragraph({
            children: buildRunsForFragment(frag),
            bullet: { level: 0 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: buildRunsForFragment(frag),
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });
  const buf = await Packer.toBuffer(doc);
  return Buffer.from(buf);
}

const PDF_FONT_SIZE_BODY = 11;
const PDF_FONT_SIZE_HEADING = 14;
const PDF_FONT_SIZE_TITLE = 18;
const PDF_LINE_HEIGHT = 1.25;
const PDF_MARGIN = 40;
const PDF_PAGE_WIDTH = 595;
const PDF_PAGE_HEIGHT = 842;
const PDF_BULLET = "• ";
const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - 2 * PDF_MARGIN;
const PDF_CONTENT_SAFE_WIDTH = PDF_CONTENT_WIDTH * 0.9;

function wrapPdfLine(
  text: string,
  font: { widthOfTextAtSize: (t: string, size: number) => number },
  fontSize: number,
  maxWidth: number
): string[] {
  if (!text.trim()) return [text || " "];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Builds a styled PDF buffer for the demo CV (title/heading sizes, bullet prefix).
 */
export async function buildStyledDemoCvPdf(
  variant: DemoVariant
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let currentPage = doc.addPage();
  let y = PDF_PAGE_HEIGHT - PDF_MARGIN;

  function lineHeight(size: number): number {
    return size * PDF_LINE_HEIGHT;
  }

  function checkNewPage(required: number): void {
    if (y - required < PDF_MARGIN) {
      currentPage = doc.addPage();
      y = PDF_PAGE_HEIGHT - PDF_MARGIN;
    }
  }

  function drawLine(
    text: string,
    opts: { size?: number; bold?: boolean; indent?: number; color?: { r: number; g: number; b: number } } = {}
  ): void {
    const size = opts.size ?? PDF_FONT_SIZE_BODY;
    const useBold = opts.bold ?? false;
    const indent = opts.indent ?? 0;
    const colorSpec = opts.color ?? { r: 0, g: 0, b: 0 };
    const x = PDF_MARGIN + indent;
    const baseFont = useBold ? fontBold : font;
    const wrapped = wrapPdfLine(text, baseFont, size, PDF_CONTENT_SAFE_WIDTH);
    for (const segment of wrapped) {
      checkNewPage(lineHeight(size));
      currentPage.drawText(segment || " ", {
        x,
        y,
        size,
        font: baseFont,
        color: rgb(colorSpec.r, colorSpec.g, colorSpec.b),
      });
      y -= lineHeight(size);
    }
  }

  function addLinkAnnotation(
    page: typeof currentPage,
    href: string,
    x: number,
    yTop: number,
    textWidth: number,
    size: number
  ): void {
    const height = lineHeight(size);
    const yBottom = yTop - height;
    const linkAnnot = doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, yBottom, x + textWidth, yTop],
      Border: [0, 0, 0],
      A: {
        Type: "Action",
        S: "URI",
        URI: PDFString.of(href),
      },
    });
    const linkRef = doc.context.register(linkAnnot);
    const existingAnnots = page.node.Annots();
    if (existingAnnots) {
      existingAnnots.push(linkRef);
    } else {
      page.node.set(PDFName.of("Annots"), doc.context.obj([linkRef]));
    }
  }

  for (const section of DEMO_CV_SECTIONS) {
    const fragments = getFragmentsForVariant(section, variant);
    if (fragments.length === 0) continue;

    const isHeader = section.id === "header";
    const isSummary = section.id === "summary";
    const useBullets =
      !isHeader &&
      !isSummary &&
      (section.id === "skills" ||
        section.id.startsWith("experience") ||
        section.id === "education" ||
        section.id === "certifications" ||
        section.id === "publications" ||
        section.id === "projects" ||
        section.id === "interests");

    if (isHeader) {
      drawLine(fragments[0]?.text ?? "", {
        size: PDF_FONT_SIZE_TITLE,
        bold: true,
      });
      const contact = fragments[1];
      if (contact && contact.links && contact.links.length > 0) {
        const emailLink = contact.links.find((l) =>
          l.label.includes("@")
        );
        const linkedInLink = contact.links.find((l) =>
          l.label.startsWith("linkedin.com")
        );
        const githubLink = contact.links.find((l) =>
          l.label.startsWith("github.com")
        );
        const linkColor = { r: 0, g: 0, b: 1 };
        if (emailLink) {
          const size = PDF_FONT_SIZE_BODY;
          const label = `Email: ${emailLink.label}`;
          const x = PDF_MARGIN;
          const width = font.widthOfTextAtSize(label, size);
          checkNewPage(lineHeight(size));
          currentPage.drawText(label, {
            x,
            y,
            size,
            font,
            color: rgb(linkColor.r, linkColor.g, linkColor.b),
          });
          addLinkAnnotation(currentPage, emailLink.href, x, y, width, size);
          y -= lineHeight(size);
        }
        if (linkedInLink) {
          const size = PDF_FONT_SIZE_BODY;
          const label = `LinkedIn: ${linkedInLink.label}`;
          const x = PDF_MARGIN;
          const width = font.widthOfTextAtSize(label, size);
          checkNewPage(lineHeight(size));
          currentPage.drawText(label, {
            x,
            y,
            size,
            font,
            color: rgb(linkColor.r, linkColor.g, linkColor.b),
          });
          addLinkAnnotation(currentPage, linkedInLink.href, x, y, width, size);
          y -= lineHeight(size);
        }
        if (githubLink) {
          const size = PDF_FONT_SIZE_BODY;
          const label = `GitHub: ${githubLink.label}`;
          const x = PDF_MARGIN;
          const width = font.widthOfTextAtSize(label, size);
          checkNewPage(lineHeight(size));
          currentPage.drawText(label, {
            x,
            y,
            size,
            font,
            color: rgb(linkColor.r, linkColor.g, linkColor.b),
          });
          addLinkAnnotation(currentPage, githubLink.href, x, y, width, size);
          y -= lineHeight(size);
        }
      } else if (fragments[1]) {
        drawLine(fragments[1].text, { size: PDF_FONT_SIZE_BODY });
      }
      y -= lineHeight(PDF_FONT_SIZE_BODY) * 0.5;
      continue;
    }

    drawLine(section.title, {
      size: PDF_FONT_SIZE_HEADING,
      bold: true,
    });
    y -= lineHeight(PDF_FONT_SIZE_HEADING) * 0.3;

    for (const frag of fragments) {
      const isRoleHeader =
        section.id.startsWith("experience") &&
        (frag.id.endsWith("_header") || frag.id.endsWith("_past_header"));
      if (isRoleHeader) {
        drawLine(frag.text, { bold: true });
      } else if (useBullets) {
        drawLine(PDF_BULLET + frag.text, { indent: 0 });
      } else {
        drawLine(frag.text);
      }
    }
    y -= lineHeight(PDF_FONT_SIZE_BODY) * 0.5;
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

/** Escape a string for use inside a PDF literal string (content stream): \ ( ) */
function escapePdfString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Builds a demo PDF with an uncompressed content stream so PII appears as literal
 * bytes. Enables in-place token replacement (replacePiiWithTokensInPdfBuffer) and
 * thus preserve-styles path when hardening. Same content as styled demo (all eggs
 * exercised); simple single-font layout.
 */
export function buildUncompressedDemoCvPdf(variant: DemoVariant): Buffer {
  const lines: string[] = [];
  const bullet = "• ";
  for (const section of DEMO_CV_SECTIONS) {
    const fragments = getFragmentsForVariant(section, variant);
    if (fragments.length === 0) continue;

    const isHeader = section.id === "header";
    const isSummary = section.id === "summary";
    const useBullets =
      !isHeader &&
      !isSummary &&
      (section.id === "skills" ||
        section.id.startsWith("experience") ||
        section.id === "education" ||
        section.id === "certifications" ||
        section.id === "publications" ||
        section.id === "projects" ||
        section.id === "interests");

    if (isHeader) {
      lines.push(fragments[0]?.text ?? "");
      if (fragments[1]) lines.push(fragments[1].text);
      lines.push("");
      continue;
    }

    lines.push(section.title);
    for (const frag of fragments) {
      const isRoleHeader =
        section.id.startsWith("experience") &&
        (frag.id.endsWith("_header") || frag.id.endsWith("_past_header"));
      if (isRoleHeader) {
        lines.push(frag.text);
      } else if (useBullets) {
        lines.push(bullet + frag.text);
      } else {
        lines.push(frag.text);
      }
    }
    lines.push("");
  }

  // Content stream: uncompressed so PII is findable in raw buffer
  const lineHeight = 14;
  let streamBody = "BT /F1 11 Tf 72 720 Td ";
  for (let i = 0; i < lines.length; i++) {
    const escaped = escapePdfString(lines[i] || " ");
    streamBody += `(${escaped}) Tj `;
    if (i < lines.length - 1) {
      streamBody += `0 -${lineHeight} Td `;
    }
  }
  streamBody += "ET";
  const streamBytes = Buffer.from(streamBody, "utf8");

  // PDF objects (fixed layout; stream length dynamic)
  const header = "%PDF-1.4\n";
  const obj1 = "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n";
  const obj2 = "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n";
  const obj3 =
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n";
  const streamDict = `4 0 obj << /Length ${streamBytes.length} >> stream\n`;
  const streamEnd = "\nendstream endobj\n";
  const obj5 =
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n";

  const beforeXref =
    header + obj1 + obj2 + obj3 + streamDict + streamBytes + streamEnd + obj5;
  const xrefOffset = beforeXref.length;

  // XREF: 6 entries (0-5). Entry 0 is free. Entries 1-5 are object starts.
  const o0 = header.length;
  const o1 = o0 + obj1.length;
  const o2 = o1 + obj2.length;
  const o3 = o2 + obj3.length;
  const o5 = o3 + streamDict.length + streamBytes.length + streamEnd.length;

  const xref =
    "xref\n0 6\n0000000000 65535 f \n" +
    `${String(o0).padStart(10, "0")} 00000 n \n` +
    `${String(o1).padStart(10, "0")} 00000 n \n` +
    `${String(o2).padStart(10, "0")} 00000 n \n` +
    `${String(o3).padStart(10, "0")} 00000 n \n` +
    `${String(o5).padStart(10, "0")} 00000 n \n`;

  const trailer =
    "trailer << /Size 6 /Root 1 0 R >>\nstartxref\n" +
    String(xrefOffset) +
    "\n%%EOF\n";

  return Buffer.concat([
    Buffer.from(beforeXref, "utf8"),
    Buffer.from(xref + trailer, "utf8"),
  ]);
}
