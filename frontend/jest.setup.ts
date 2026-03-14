import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

if (typeof globalThis.TextEncoder === "undefined") {
  (globalThis as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  (globalThis as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

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
