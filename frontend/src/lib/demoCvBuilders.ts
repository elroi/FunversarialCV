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
import { toPdfStreamSafe } from "./pdfWinAnsi";

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

/** One line in the uncompressed demo PDF with an optional font size (default body). */
const PDF_UNCOMPRESSED_TITLE = 18;
const PDF_UNCOMPRESSED_HEADING = 14;
const PDF_UNCOMPRESSED_BODY = 11;
const PDF_UNCOMPRESSED_MARGIN = 72;
const PDF_UNCOMPRESSED_CONTENT_WIDTH = 515 * 0.9; // ~same as PDF_CONTENT_SAFE_WIDTH

/** Approximate width of text in Helvetica (pt). Average ~0.5 * fontSize per character. */
function estimatePdfTextWidth(text: string, fontSizePt: number): number {
  return text.length * 0.5 * fontSizePt;
}

/** Word-wrap text to fit within maxWidthPt using Helvetica width estimate. */
function wrapPdfLineUncompressed(
  text: string,
  fontSizePt: number,
  maxWidthPt: number
): string[] {
  if (!text.trim()) return [text || " "];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const w = estimatePdfTextWidth(candidate, fontSizePt);
    if (w <= maxWidthPt) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Segment for header contact: either plain text or a link (href + label text). */
type ContactSegment = { type: "text"; text: string } | { type: "link"; text: string; href: string };

/** Separator between contact parts: middle dot (U+00B7) or bullet (U+2022), with optional spaces. */
const CONTACT_SEP_RE = /\s*[\u00B7\u2022]\s*/;

/** Splits contact by separator into parts; each part that matches a link gets that href; phone gets tel:. */
function buildContactSegments(
  text: string,
  links: { label: string; href: string }[] | undefined
): ContactSegment[] {
  const phoneRe = /\+?\d[\d\s.-]{8,}/;
  let parts = text
    .split(CONTACT_SEP_RE)
    .map((p) => p.trim())
    .filter(Boolean);

  // If split produced only one part (separator not found), split by link labels + phone so we still get multiple links
  if (parts.length <= 1 && links && links.length > 0) {
    const segs: ContactSegment[] = [];
    let remaining = text;
    const byPos: { label: string; href: string; idx: number }[] = links.map((l) => ({
      label: l.label,
      href: l.href,
      idx: text.indexOf(l.label),
    }));
    const phoneMatch = text.match(phoneRe);
    if (phoneMatch) {
      const [full] = phoneMatch;
      byPos.push({
        label: full,
        href: "tel:" + full.replace(/\D/g, ""),
        idx: text.indexOf(full),
      });
    }
    const sorted = byPos.filter((o) => o.idx >= 0).sort((a, b) => a.idx - b.idx);
    for (const { label, href, idx } of sorted) {
      if (idx > remaining.length) continue;
      const localIdx = remaining.indexOf(label);
      if (localIdx === -1) continue;
      if (localIdx > 0) segs.push({ type: "text", text: remaining.slice(0, localIdx) });
      segs.push({ type: "link", text: label, href });
      remaining = remaining.slice(localIdx + label.length);
    }
    if (remaining.trim()) segs.push({ type: "text", text: remaining });
    return segs.length > 0 ? segs : [{ type: "text", text }];
  }

  const segments: ContactSegment[] = [];
  for (const part of parts) {
    const link = links?.find((l) => part.includes(l.label));
    if (link) {
      segments.push({ type: "link", text: part, href: link.href });
    } else if (phoneRe.test(part)) {
      const m = part.match(phoneRe);
      const tel = m ? "tel:" + m[0].replace(/\D/g, "") : "";
      segments.push({ type: "link", text: part, href: tel });
    } else {
      segments.push({ type: "text", text: part });
    }
  }
  if (segments.length === 0 && text) segments.push({ type: "text", text });
  return segments;
}

/**
 * Builds a demo PDF with an uncompressed content stream so PII appears as literal
 * bytes. Enables in-place token replacement (replacePiiWithTokensInPdfBuffer) and
 * thus preserve-styles path when hardening. Uses title/heading/body sizes, word
 * wrapping, bullets, and link annotations (mailto, tel, URLs).
 */
export function buildUncompressedDemoCvPdf(variant: DemoVariant): Buffer {
  type TextBlock = { text: string; size: number; href?: string };
  const blocks: TextBlock[] = [];
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
      blocks.push({
        text: fragments[0]?.text ?? "",
        size: PDF_UNCOMPRESSED_TITLE,
      });
      const contact = fragments[1];
      if (contact?.links?.length) {
        const segs = buildContactSegments(contact.text, contact.links);
        for (const seg of segs) {
          if (seg.type === "text") {
            blocks.push({ text: seg.text, size: PDF_UNCOMPRESSED_BODY });
          } else {
            blocks.push({
              text: seg.text,
              size: PDF_UNCOMPRESSED_BODY,
              href: seg.href,
            });
          }
        }
      } else if (contact) {
        blocks.push({ text: contact.text, size: PDF_UNCOMPRESSED_BODY });
      }
      blocks.push({ text: "", size: PDF_UNCOMPRESSED_BODY });
      continue;
    }

    blocks.push({
      text: section.title,
      size: PDF_UNCOMPRESSED_HEADING,
    });
    for (const frag of fragments) {
      const isRoleHeader =
        section.id.startsWith("experience") &&
        (frag.id.endsWith("_header") || frag.id.endsWith("_past_header"));
      if (isRoleHeader) {
        blocks.push({ text: frag.text, size: PDF_UNCOMPRESSED_BODY });
      } else if (useBullets) {
        blocks.push({
          text: bullet + frag.text,
          size: PDF_UNCOMPRESSED_BODY,
        });
      } else {
        blocks.push({ text: frag.text, size: PDF_UNCOMPRESSED_BODY });
      }
    }
    blocks.push({ text: "", size: PDF_UNCOMPRESSED_BODY });
  }

  // Flatten with word wrap: each block becomes one or more lines; link blocks record href per line
  type FlatLine = { text: string; size: number; href?: string };
  const flatLines: FlatLine[] = [];
  for (const block of blocks) {
    const wrapped = wrapPdfLineUncompressed(
      block.text,
      block.size,
      PDF_UNCOMPRESSED_CONTENT_WIDTH
    );
    for (const line of wrapped) {
      flatLines.push({
        text: line,
        size: block.size,
        href: block.href,
      });
    }
  }

  // Build content stream and collect link rects. PDF y increases upward; Td sets baseline, so rect is [x, baseline, x+w, baseline+fontSize].
  const marginX = PDF_UNCOMPRESSED_MARGIN;
  const startY = 720;
  const linkRects: { x: number; baseline: number; w: number; fontSize: number; href: string }[] = [];

  let streamBody = `BT /F1 ${flatLines[0].size} Tf ${marginX} ${startY} Td `;
  let currentY = startY;
  let currentSize = flatLines[0].size;

  for (let i = 0; i < flatLines.length; i++) {
    const { text, size, href } = flatLines[i];
    const safeLine = toPdfStreamSafe(text || " ");
    const escaped = escapePdfString(safeLine);
    if (i > 0) {
      const prevSize = flatLines[i - 1].size;
      const lineHeight = Math.round(prevSize * 1.25);
      currentY -= lineHeight;
      streamBody += `0 -${lineHeight} Td `;
      if (size !== prevSize) {
        currentSize = size;
        streamBody += `/F1 ${size} Tf `;
      }
    }
    const lineHeight = Math.round(currentSize * 1.25);
    const width = estimatePdfTextWidth(safeLine || " ", currentSize);
    if (href) streamBody += "0 0 1 rg "; // blue for link text (visible)
    streamBody += `(${escaped}) Tj `;
    if (href) {
      streamBody += "0 0 0 rg "; // restore black
      linkRects.push({
        x: marginX,
        baseline: currentY,
        w: width,
        fontSize: currentSize,
        href,
      });
    }
  }
  streamBody += "ET";
  const streamBytes = Buffer.from(streamBody, "utf8");

  // PDF string escape for URI (parentheses and backslash)
  function escapePdfUri(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  const numAnnots = linkRects.length;
  const annotRefs = Array.from(
    { length: numAnnots },
    (_, j) => `${6 + j} 0 R`
  ).join(" ");
  const annotsArray = numAnnots > 0 ? ` /Annots [ ${annotRefs} ]` : "";

  // CRLF line endings for strict viewer compatibility (Preview, Acrobat on Mac)
  const EOL = "\r\n";
  const header = `%PDF-1.4${EOL}`;
  const obj1 = `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj${EOL}`;
  const obj2 = `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj${EOL}`;
  const obj3 =
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >>${annotsArray} >> endobj${EOL}`;
  const streamDict = `4 0 obj << /Length ${streamBytes.length} >> stream${EOL}`;
  const streamEnd = `${EOL}endstream endobj${EOL}`;
  const obj5 =
    `5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj${EOL}`;

  const annotObjs: string[] = [];
  for (let j = 0; j < linkRects.length; j++) {
    const r = linkRects[j];
    const rect = `[ ${r.x} ${r.baseline} ${r.x + r.w} ${r.baseline + r.fontSize} ]`;
    const uri = escapePdfUri(r.href);
    annotObjs.push(
      `${6 + j} 0 obj << /Type /Annot /Subtype /Link /Rect ${rect} /Border [0 0 0] /A << /Type /Action /S /URI /URI (${uri}) >> >> endobj${EOL}`
    );
  }

  // Build body from buffers so xref offsets are byte-exact (Preview/Acrobat require correct xref)
  const enc = (s: string) => Buffer.from(s, "utf8");
  const chunks: Buffer[] = [
    enc(header),
    enc(obj1),
    enc(obj2),
    enc(obj3),
    enc(streamDict),
    streamBytes,
    enc(streamEnd),
    enc(obj5),
    enc(annotObjs.join("")),
  ];
  const body = Buffer.concat(chunks);
  let offset = 0;
  const o0 = offset;
  offset += enc(header).length;
  const o1 = offset;
  offset += enc(obj1).length;
  const o2 = offset;
  offset += enc(obj2).length;
  const o3 = offset;
  offset += enc(obj3).length;
  const o4Start = offset;
  offset += enc(streamDict).length + streamBytes.length + enc(streamEnd).length;
  const o5Start = offset;
  offset += enc(obj5).length;
  const annotOffsets: number[] = [];
  for (const ann of annotObjs) {
    annotOffsets.push(offset);
    offset += enc(ann).length;
  }

  const totalObjects = 6 + numAnnots;
  const xrefLines: string[] = ["xref", `0 ${totalObjects + 1}`, "0000000000 65535 f "];
  xrefLines.push(`${String(o0).padStart(10, "0")} 00000 n `);
  xrefLines.push(`${String(o1).padStart(10, "0")} 00000 n `);
  xrefLines.push(`${String(o2).padStart(10, "0")} 00000 n `);
  xrefLines.push(`${String(o3).padStart(10, "0")} 00000 n `);
  xrefLines.push(`${String(o4Start).padStart(10, "0")} 00000 n `);
  xrefLines.push(`${String(o5Start).padStart(10, "0")} 00000 n `);
  for (const o of annotOffsets) {
    xrefLines.push(`${String(o).padStart(10, "0")} 00000 n `);
  }
  const xref = xrefLines.join(EOL) + EOL;
  const trailerStr =
    `trailer << /Size ${totalObjects + 1} /Root 1 0 R >>${EOL}startxref${EOL}` +
    String(body.length) +
    `${EOL}%%EOF${EOL}`;

  return Buffer.concat([body, enc(xref + trailerStr)]);
}
