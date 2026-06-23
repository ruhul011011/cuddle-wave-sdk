import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTransactions } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const listFn = useServerFn(listTransactions);
  const q = useQuery({ queryKey: ["admin", "tx"], queryFn: () => listFn() });
  const total = q.data?.filter((t: any) => t.status === "succeeded").reduce((a: number, t: any) => a + Number(t.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Transactions</h1>
        <div className="rounded-2xl border border-border/60 bg-card px-5 py-3 text-sm">
          <span className="text-muted-foreground">Total revenue: </span>
          <span className="font-display text-xl text-primary">${total.toFixed(2)}</span>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left p-3">Date</th><th className="text-left p-3">User</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Status</th><th className="text-left p-3">Provider</th><th className="text-left p-3">Ref</th></tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {q.data?.map((t: any) => (
              <tr key={t.id}>
                <td className="p-3 text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                <td className="p-3 text-xs font-mono">{t.user_id.slice(0, 8)}…</td>
                <td className="p-3 font-semibold">{t.currency} {Number(t.amount).toFixed(2)}</td>
                <td className="p-3"><span className={`text-xs rounded px-2 py-0.5 ${t.status === "succeeded" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{t.status}</span></td>
                <td className="p-3 text-muted-foreground">{t.provider ?? "—"}</td>
                <td className="p-3 text-muted-foreground text-xs">{t.reference ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!q.data?.length && <div className="p-8 text-center text-sm text-muted-foreground">No transactions yet.</div>}
      </div>
    </div>
  );
}
