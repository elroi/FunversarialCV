import { getRecentCanaryHits } from "@/lib/canaryHits";

type SearchParams = { [key: string]: string | string[] | undefined };

interface PageProps {
  searchParams?: SearchParams;
}

export default function CanaryAdminPage({ searchParams }: PageProps) {
  const adminKeyEnv = process.env.CANARY_ADMIN_KEY;
  const keyParam = searchParams?.key;
  const authorized =
    !adminKeyEnv || (typeof keyParam === "string" && keyParam === adminKeyEnv);

  if (!authorized) {
    return (
      <main className="min-h-screen bg-noir-bg text-noir-foreground px-4 py-6">
        <h1 className="text-lg font-semibold mb-2">Not authorized</h1>
        <p className="text-sm text-noir-foreground/70">
          Canary analytics are gated. Provide a valid admin key to view this
          page.
        </p>
      </main>
    );
  }

  const hits = getRecentCanaryHits(200);

  return (
    <main className="min-h-screen bg-noir-bg text-noir-foreground px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="text-xl font-semibold">Canary Wing hits</h1>
          <p className="mt-1 text-xs text-noir-foreground/70">
            Experimental internal analytics for Canary Wing. Data is
            process-local and bounded; no PII is stored, only token, variant,
            timestamp, user agent, and referer.
          </p>
        </header>
        {hits.length === 0 ? (
          <p className="text-sm text-noir-foreground/70">
            No canary hits recorded in this process.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border border-noir-border bg-noir-panel/70">
            <table className="min-w-full text-xs">
              <thead className="bg-noir-panel border-b border-noir-border">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Token</th>
                  <th className="px-3 py-2 text-left font-semibold">Variant</th>
                  <th className="px-3 py-2 text-left font-semibold">Timestamp</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    User agent
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Referer</th>
                </tr>
              </thead>
              <tbody>
                {hits.map((hit, index) => (
                  <tr
                    key={`${hit.tokenId}-${hit.ts}-${index}`}
                    className="border-t border-noir-border/50"
                  >
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {hit.tokenId}
                    </td>
                    <td className="px-3 py-2 text-[11px]">{hit.variant}</td>
                    <td className="px-3 py-2 text-[11px]">{hit.ts}</td>
                    <td className="px-3 py-2 text-[11px]">
                      {hit.userAgent ?? ""}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {hit.referer ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

