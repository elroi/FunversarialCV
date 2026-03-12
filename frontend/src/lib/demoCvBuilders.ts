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
