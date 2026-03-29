import React from "react";
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AudienceProvider, useAudience } from "./AudienceContext";

function Toggler() {
  const { audience, setAudience } = useAudience();
  return (
    <button
      type="button"
      onClick={() => setAudience(audience === "hr" ? "security" : "hr")}
    >
      Toggle audience
    </button>
  );
}

function ContentAudienceProbe() {
  const { contentAudience } = useAudience();
  return <span data-testid="content-audience">{contentAudience}</span>;
}

describe("AudienceProvider", () => {
  beforeEach(() => {
    window.localStorage.removeItem("funversarialcv-audience");
    document.documentElement.removeAttribute("data-audience");
    document.documentElement.style.setProperty("--theme-transition-duration", "220ms");
  });

  afterEach(() => {
    document.documentElement.style.removeProperty("--theme-transition-duration");
  });

  it("does not remove data-audience when audience changes (avoids theme variable flash)", async () => {
    const removeSpy = jest.spyOn(document.documentElement, "removeAttribute");

    jest.useFakeTimers();
    const { unmount } = render(
      <AudienceProvider>
        <Toggler />
      </AudienceProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-audience")).toBe("hr");
    });

    removeSpy.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /toggle audience/i }));

    expect(document.documentElement.getAttribute("data-audience")).toBe("hr");

    act(() => {
      jest.advanceTimersByTime(220);
    });
    expect(document.documentElement.getAttribute("data-audience")).toBe("security");
    expect(
      removeSpy.mock.calls.filter((call) => call[0] === "data-audience")
    ).toHaveLength(0);

    unmount();
    jest.useRealTimers();
    expect(removeSpy).toHaveBeenCalledWith("data-audience");
  });

  it("updates contentAudience after fade-out delay while audience updates immediately", async () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      media: "",
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    jest.useFakeTimers();
    const { unmount } = render(
      <AudienceProvider>
        <Toggler />
        <ContentAudienceProbe />
      </AudienceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("content-audience")).toHaveTextContent("hr");
    });

    fireEvent.click(screen.getByRole("button", { name: /toggle audience/i }));
    expect(screen.getByTestId("content-audience")).toHaveTextContent("hr");

    act(() => {
      jest.advanceTimersByTime(220);
    });
    expect(screen.getByTestId("content-audience")).toHaveTextContent("security");

    unmount();
    jest.useRealTimers();
  });
});
