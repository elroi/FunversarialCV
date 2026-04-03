/**
 * Committed JD baseline artifacts + smoke check for gen-jd-baseline.mjs demo output path.
 */

import { execSync } from "child_process";
import { existsSync, mkdtempSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("JD baseline fixtures (e2e/fixtures)", () => {
  it("jd-baseline.txt exists and contains fixture markers", () => {
    const p = join(process.cwd(), "e2e/fixtures/jd-baseline.txt");
    expect(existsSync(p)).toBe(true);
    const t = readFileSync(p, "utf8");
    expect(t).toMatch(/FunversarialCV Baseline Job Description/);
    expect(t).toMatch(/clean candidate CV/);
  });

  it("jd-baseline.docx exists and is a ZIP (OOXML)", () => {
    const p = join(process.cwd(), "e2e/fixtures/jd-baseline.docx");
    expect(existsSync(p)).toBe(true);
    const b = readFileSync(p);
    expect(b[0]).toBe(0x50);
    expect(b[1]).toBe(0x4b);
  });
});

describe("gen-jd-baseline.mjs", () => {
  it("writes jd-baseline copies into JD_BASELINE_DEMO_DIR", () => {
    const dir = mkdtempSync(join(tmpdir(), "fv-jd-"));
    execSync("node scripts/gen-jd-baseline.mjs", {
      cwd: process.cwd(),
      env: { ...process.env, JD_BASELINE_DEMO_DIR: dir },
      encoding: "utf8",
    });
    expect(existsSync(join(dir, "jd-baseline.docx"))).toBe(true);
    expect(existsSync(join(dir, "jd-baseline.txt"))).toBe(true);
  });
});
