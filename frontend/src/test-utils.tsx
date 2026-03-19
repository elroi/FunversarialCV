import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { AudienceProvider } from "./contexts/AudienceContext";

/**
 * Wraps children with AudienceProvider so components that use useAudience/useCopy
 * can be tested in isolation.
 */
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return <AudienceProvider>{children}</AudienceProvider>;
}

/**
 * Custom render that wraps the UI with AudienceProvider.
 * Use for components that call useCopy() or useAudience().
 */
function renderWithAudience(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, {
    wrapper: AllTheProviders,
    ...options,
  });
}

export { renderWithAudience, AllTheProviders };
