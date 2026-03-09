import "@testing-library/jest-dom";

// Suppress known React/jsdom warnings that do not indicate test failures.
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === "string" ? args[0] : String(args[0]);
    if (msg.includes("Warning: An update to") && msg.includes("was not wrapped in act(...)")) return;
    if (msg.includes("Not implemented: navigation (except hash changes)")) return;
    originalError.apply(console, args);
  };
});
afterAll(() => {
  console.error = originalError;
});
