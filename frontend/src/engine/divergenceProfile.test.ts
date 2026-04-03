/**
 * Machine-divergence profile: payload shaping for parser-visible signal vs human-visible guardrails.
 */

import {
  applyHardenProfileToPayloads,
  parseHardenDivergenceProfile,
} from "./divergenceProfile";
import { invisibleHand } from "../eggs/InvisibleHand";
import { metadataShadow } from "../eggs/MetadataShadow";
import { canaryWing } from "../eggs/CanaryWing";
import { incidentMailto } from "../eggs/IncidentMailto";
import { DEFAULT_INVISIBLE_HAND_TRAP } from "../eggs/InvisibleHand";

describe("parseHardenDivergenceProfile", () => {
  it("maps absent/unknown to balanced", () => {
    expect(parseHardenDivergenceProfile(null)).toBe("balanced");
    expect(parseHardenDivergenceProfile(undefined)).toBe("balanced");
    expect(parseHardenDivergenceProfile("")).toBe("balanced");
    expect(parseHardenDivergenceProfile("nope")).toBe("balanced");
  });

  it("accepts balanced, machine, visible", () => {
    expect(parseHardenDivergenceProfile("balanced")).toBe("balanced");
    expect(parseHardenDivergenceProfile("machine")).toBe("machine");
    expect(parseHardenDivergenceProfile("visible")).toBe("visible");
  });
});

describe("applyHardenProfileToPayloads", () => {
  it("balanced leaves payloads unchanged", () => {
    const p = { "invisible-hand": "custom trap" };
    expect(
      applyHardenProfileToPayloads("balanced", ["invisible-hand"], p)
    ).toEqual(p);
  });

  it("machine lengthens invisible-hand trap vs default-only baseline (selected egg)", () => {
    const machine = applyHardenProfileToPayloads("machine", ["invisible-hand"], {});
    expect(invisibleHand.validatePayload(machine["invisible-hand"]!)).toBe(true);
    expect(machine["invisible-hand"]!.length).toBeGreaterThan(
      DEFAULT_INVISIBLE_HAND_TRAP.length
    );
  });

  it("machine merges metadata-shadow decoys into custom props", () => {
    const merged = applyHardenProfileToPayloads("machine", ["metadata-shadow"], {});
    expect(metadataShadow.validatePayload(merged["metadata-shadow"]!)).toBe(true);
    expect(merged["metadata-shadow"]).toMatch(/ParserDirective_Priority/);
    expect(merged["metadata-shadow"]).toMatch(/LLM_Context_Seed/);
  });

  it("machine forces canary docxClickableVisible false even when payload requests true", () => {
    const raw = JSON.stringify({
      token: "abc-def-12",
      docxClickableVisible: true,
    });
    const merged = applyHardenProfileToPayloads("machine", ["canary-wing"], {
      "canary-wing": raw,
    });
    expect(canaryWing.validatePayload(merged["canary-wing"]!)).toBe(true);
    const parsed = JSON.parse(merged["canary-wing"]!) as {
      docxClickableVisible?: boolean;
      docxClickableLink?: boolean;
    };
    expect(parsed.docxClickableVisible).toBe(false);
    expect(parsed.docxClickableLink).toBe(true);
  });

  it("visible profile enables docxClickableVisible on canary", () => {
    const merged = applyHardenProfileToPayloads("visible", ["canary-wing"], {
      "canary-wing": JSON.stringify({ token: "abc-def-12" }),
    });
    expect(canaryWing.validatePayload(merged["canary-wing"]!)).toBe(true);
    const parsed = JSON.parse(merged["canary-wing"]!) as {
      docxClickableVisible?: boolean;
    };
    expect(parsed.docxClickableVisible).toBe(true);
  });

  it("machine adds incident-mailto template extraParams for parser-visible mailto surface", () => {
    const merged = applyHardenProfileToPayloads("machine", ["incident-mailto"], {});
    expect(incidentMailto.validatePayload(merged["incident-mailto"]!)).toBe(true);
    expect(merged["incident-mailto"]).toMatch(/x_funversarial_parser_probe/);
  });

  it("skips eggs not in selection list", () => {
    const merged = applyHardenProfileToPayloads("machine", ["canary-wing"], {
      "invisible-hand": "",
    });
    expect(merged["invisible-hand"]).toBe("");
  });
});
