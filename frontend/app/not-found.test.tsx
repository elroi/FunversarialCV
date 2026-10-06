import React from "react";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("uses the dark console shell and links back home", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    const home = screen.getByRole("link", { name: /back home/i });
    expect(home).toHaveAttribute("href", "/");
    expect(screen.getByRole("main").className).toContain("bg-noir-bg");
    expect(screen.getByRole("main").className).toContain("text-noir-foreground");
  });
});
