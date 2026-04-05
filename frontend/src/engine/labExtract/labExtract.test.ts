/**
 * @jest-environment node
 */

import { Document, Packer, Paragraph, TextRun, ExternalHyperlink } from "docx";
import { extractDocxForLab } from "./extractDocxLab";
import { LAB_HARNESS_VERSION } from "./constants";

/** Known substring embedded in word/document.xml for forensic mode tests. */
export const LAB_FIXTURE_TRAP = "FUNV_LAB_TRAP_X9q2";

async function buildLabFixtureDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: `Lead line with ${LAB_FIXTURE_TRAP} marker.` })],
          }),
          new Paragraph({
            children: [
              new ExternalHyperlink({
                link: "mailto:lab-incident@example.com?subject=FunversarialLab",
                children: [
                  new TextRun({
                    text: "Report incident",
                    style: "Hyperlink",
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            children: [
              new ExternalHyperlink({
                link: "https://example.test/canary-lab-owasp-demo",
                children: [
                  new TextRun({
                    text: "Canary link",
                    style: "Hyperlink",
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });
  const buf = await Packer.toBuffer(doc);
  return Buffer.from(buf);
}

describe("extractDocxForLab", () => {
  it("returns versioned modes including trap text, metadata keys, and mailto/https hyperlinks", async () => {
    const buffer = await buildLabFixtureDocx();
    const result = await extractDocxForLab(buffer);

    expect(result.harnessVersion).toBe(LAB_HARNESS_VERSION);
    expect(result.modes).toHaveLength(5);

    const forensic = result.modes.find((m) => m.modeId === "docx_forensic_body");
    expect(forensic && "text" in forensic).toBe(true);
    if (forensic && "text" in forensic) {
      expect(forensic.text).toContain(LAB_FIXTURE_TRAP);
    }

    const links = result.modes.find((m) => m.modeId === "docx_hyperlinks");
    expect(links && "links" in links).toBe(true);
    if (links && "links" in links) {
      const targets = links.links.map((l) => l.target);
      expect(targets.some((t) => t.startsWith("mailto:lab-incident"))).toBe(true);
      expect(targets.some((t) => t.includes("example.test/canary-lab-owasp-demo"))).toBe(
        true
      );
      expect(links.links.some((l) => l.scheme === "mailto")).toBe(true);
      expect(links.links.some((l) => l.scheme === "https")).toBe(true);
    }

    const meta = result.modes.find((m) => m.modeId === "docx_package_metadata");
    expect(meta && "entries" in meta).toBe(true);

    const word = result.modes.find((m) => m.modeId === "server_word_extractor");
    const mammoth = result.modes.find((m) => m.modeId === "server_mammoth_raw");
    expect(word && "text" in word && word.text.length).toBeGreaterThan(0);
    expect(mammoth && "text" in mammoth && mammoth.text.length).toBeGreaterThan(0);
  });

  it("matches golden snapshot for normalized text modes (fixture-built docx)", async () => {
    const buffer = await buildLabFixtureDocx();
    const result = await extractDocxForLab(buffer);
    const snapshotPayload = result.modes.map((m) => {
      if ("text" in m) {
        return { modeId: m.modeId, text: m.text.replace(/\r\n/g, "\n").trim(), warnings: m.warnings };
      }
      if ("entries" in m) {
        return { modeId: m.modeId, entries: m.entries, warnings: m.warnings };
      }
      return { modeId: m.modeId, links: m.links, warnings: m.warnings };
    });
    expect(snapshotPayload).toMatchSnapshot();
  });
});
