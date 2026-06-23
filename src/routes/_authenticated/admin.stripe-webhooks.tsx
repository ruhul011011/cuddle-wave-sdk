import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStripeWebhookLogs } from "@/lib/stripe-logs.functions";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle, MinusCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/stripe-webhooks")({
  component: StripeWebhooksPage,
});

function statusBadge(status: string) {
  const map: Record<string, { cls: string; Icon: typeof CheckCircle2 }> = {
    processed: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", Icon: CheckCircle2 },
    skipped: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", Icon: AlertCircle },
    ignored: { cls: "bg-muted text-muted-foreground border-border/60", Icon: MinusCircle },
    invalid_signature: { cls: "bg-red-500/15 text-red-400 border-red-500/30", Icon: XCircle },
    db_error: { cls: "bg-red-500/15 text-red-400 border-red-500/30", Icon: XCircle },
    error: { cls: "bg-red-500/15 text-red-400 border-red-500/30", Icon: XCircle },
  };
  const { cls, Icon } = map[status] ?? { cls: "bg-secondary text-foreground border-border/60", Icon: AlertCircle };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function StripeWebhooksPage() {
  const fetchLogs = useServerFn(listStripeWebhookLogs);
  const q = useQuery({
    queryKey: ["stripe-webhook-logs"],
    queryFn: () => fetchLogs({ data: { limit: 100 } }),
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Stripe webhook logs</h1>
          <p className="text-sm text-muted-foreground">
            Verifies <code className="bg-secondary px-1 rounded">checkout.session.completed</code> events from Stripe. Auto-refreshes every 10s.
          </p>
        </div>
        <button
          onClick={() => q.refetch()}
          className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm hover:bg-secondary/70"
        >
          <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        {q.isLoading ? (
          <div className="grid place-items-center p-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : q.isError ? (
          <div className="p-6 text-sm text-red-400">{(q.error as Error).message}</div>
        ) : !q.data || q.data.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No webhook events received yet. Trigger a test event from Stripe Dashboard → Webhooks → your endpoint → Send test event.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">When</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Event</th>
                  <th className="text-left px-4 py-3">Fixture</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Message</th>
                  <th className="text-left px-4 py-3">Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {q.data.map((row) => (
                  <tr key={row.id} className="hover:bg-background/40">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.event_type ?? "—"}</td>
                    <td className="px-4 py-3">{row.fixture_id ?? "—"}</td>
                    <td className="px-4 py-3">
                      {row.amount_cents != null
                        ? `${(row.amount_cents / 100).toFixed(2)} ${(row.currency ?? "").toUpperCase()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[280px] truncate" title={row.message ?? ""}>
                      {row.message ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[180px] truncate" title={row.stripe_session_id ?? ""}>
                      {row.stripe_session_id ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
