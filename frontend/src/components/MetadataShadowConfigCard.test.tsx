/**
 * @jest-environment jsdom
 */

import React from "react";
import { act, fireEvent, screen } from "@testing-library/react";
import { MetadataShadowConfigCard } from "./MetadataShadowConfigCard";
import { renderWithAudience } from "../test-utils";

describe("MetadataShadowConfigCard", () => {
  it("emits extended custom payload with multiple rows", () => {
    let last = "{}";
    renderWithAudience(
      <MetadataShadowConfigCard
        payload={JSON.stringify({ custom: { A: "1" } })}
        onPayloadChange={(p) => {
          last = p;
        }}
      />
    );
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Add property/i }));
    });
    const nameInputs = screen.getAllByLabelText(/Property name \d+/i);
    const valInputs = screen.getAllByLabelText(
      /Property value \d+/i
    ) as HTMLTextAreaElement[];
    act(() => {
      fireEvent.change(nameInputs[1]!, { target: { value: "B" } });
      fireEvent.change(valInputs[1]!, { target: { value: "2" } });
    });
    const parsed = JSON.parse(last) as { custom: Record<string, string> };
    expect(parsed.custom.A).toBe("1");
    expect(parsed.custom.B).toBe("2");
  });

  it("hydrates legacy flat JSON into rows", () => {
    renderWithAudience(
      <MetadataShadowConfigCard
        payload={JSON.stringify({ LegacyKey: "LegacyVal" })}
        onPayloadChange={() => {}}
      />
    );
    const nameInputs = screen.getAllByLabelText(/Property name \d+/i);
    expect((nameInputs[0] as HTMLInputElement).value).toBe("LegacyKey");
    const valInputs = screen.getAllByLabelText(
      /Property value \d+/i
    ) as HTMLTextAreaElement[];
    expect(valInputs[0]!.value).toBe("LegacyVal");
  });

  it("includes standard fields in payload (section always visible)", () => {
    let last = "{}";
    renderWithAudience(
      <MetadataShadowConfigCard
        payload="{}"
        onPayloadChange={(p) => {
          last = p;
        }}
      />
    );
    act(() => {
      fireEvent.change(screen.getByLabelText(/^Title$/i), {
        target: { value: "T1" },
      });
    });
    const parsed = JSON.parse(last) as { standard: { title: string } };
    expect(parsed.standard.title).toBe("T1");
  });

  it("does not emit payload when custom value contains PII (email)", () => {
    let last = JSON.stringify({ custom: { Co: "clean" } });
    renderWithAudience(
      <MetadataShadowConfigCard
        payload={last}
        onPayloadChange={(p) => {
          last = p;
        }}
      />
    );
    const valInputs = screen.getAllByLabelText(
      /Property value \d+/i
    ) as HTMLTextAreaElement[];
    act(() => {
      fireEvent.change(valInputs[0]!, {
        target: { value: "contact me at user@example.com" },
      });
    });
    const parsed = JSON.parse(last) as { custom: Record<string, string> };
    expect(parsed.custom.Co).toBe("clean");
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
