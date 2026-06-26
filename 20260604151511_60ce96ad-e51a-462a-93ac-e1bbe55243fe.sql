import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLogs } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Logs | Asset Library" }] }),
  component: AuditPage,
});

function AuditPage() {
  const fn = useServerFn(listAuditLogs);
  const { data, isLoading, error } = useQuery({ queryKey: ["auditLogs"], queryFn: () => fn({ data: {} }) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Activity history across the library.</p>
      </div>
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Performed By</th>
              <th className="px-4 py-3">Asset</th>
              <th className="hidden px-4 py-3 md:table-cell">Details</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {data?.logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{l.action}</span></td>
                <td className="px-4 py-3 text-foreground">{l.performer_name}</td>
                <td className="px-4 py-3">
                  {l.asset_title ? (
                    <Link to="/assets/$assetId" params={{ assetId: l.asset_id }} className="text-primary hover:underline text-sm">
                      {l.asset_title}
                    </Link>
                  ) : <span className="text-muted-foreground text-sm">—</span>}
                </td>
                <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">{l.details ? JSON.stringify(l.details) : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}