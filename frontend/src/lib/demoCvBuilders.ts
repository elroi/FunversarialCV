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
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  DEMO_CV_SECTIONS,
  type DemoVariant,
  type DemoSection,
  type DemoFragment,
} from "./demoCvContent";

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
            children: [new TextRun({ text: fragments[1].text, size: 22 })],
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
            text: frag.text,
            bullet: { level: 0 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: frag.text })],
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
    opts: { size?: number; bold?: boolean; indent?: number } = {}
  ): void {
    const size = opts.size ?? PDF_FONT_SIZE_BODY;
    const useBold = opts.bold ?? false;
    const indent = opts.indent ?? 0;
    const x = PDF_MARGIN + indent;
    checkNewPage(lineHeight(size));
    currentPage.drawText(text || " ", {
      x,
      y,
      size,
      font: useBold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight(size);
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
      if (fragments[1]) {
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
