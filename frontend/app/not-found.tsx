import Link from "next/link";

/**
 * Unknown routes. Pinned to the dark console colors so this page stays dark
 * even when the HR audience theme is active on the rest of the app.
 */
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh-screen flex-col items-center justify-center bg-noir-bg px-4 py-16 text-noir-foreground"
    >
      <p className="font-mono text-sm uppercase tracking-[0.25em] text-neon-cyan">
        404
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-neon-green">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-noir-foreground/80">
        That path is not on this console.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-[44px] items-center text-sm font-medium text-neon-cyan underline decoration-neon-cyan/40 underline-offset-4 transition-colors hover:text-neon-green hover:decoration-neon-green/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-noir-bg"
      >
        Back home
      </Link>
    </main>
  );
}
