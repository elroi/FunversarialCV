import { tokensOnlyInFirst } from "./labIngestionDiff";

describe("labIngestionDiff", () => {
  it("returns tokens present only on the left", () => {
    expect(tokensOnlyInFirst("alpha beta gamma", "alpha gamma")).toEqual(["beta"]);
  });

  it("dedupes repeated left tokens", () => {
    expect(tokensOnlyInFirst("x x y", "y")).toEqual(["x"]);
  });
});
