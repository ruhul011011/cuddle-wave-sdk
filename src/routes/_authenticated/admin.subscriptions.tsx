import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSubscriptions } from "@/lib/admin.functions";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  component: SubscriptionsPage,
});

const COLORS = ["oklch(0.66 0.24 18)", "oklch(0.7 0.18 160)", "oklch(0.7 0.18 240)"];

function SubscriptionsPage() {
  const listFn = useServerFn(listSubscriptions);
  const q = useQuery({ queryKey: ["admin", "subs"], queryFn: () => listFn() });
  const byPlan = (q.data ?? []).reduce((acc: Record<string, number>, s: any) => {
    const k = s.plan ?? "free";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const data = Object.entries(byPlan).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Subscription analytics</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="font-display text-lg mb-3">Plans distribution</h2>
          {data.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={4}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "rgb(20,20,30)", border: "1px solid rgba(120,120,140,0.3)", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscriptions yet.</p>
          )}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="font-display text-lg mb-3">Recent subscriptions</h2>
          <div className="divide-y divide-border/60 text-sm">
            {q.data?.slice(0, 12).map((s: any) => (
              <div key={s.id} className="py-2 flex items-center gap-3">
                <span className="font-mono text-xs">{s.user_id.slice(0, 8)}…</span>
                <span className="text-xs rounded bg-primary/15 text-primary px-2 py-0.5">{s.plan}</span>
                <span className="ml-auto text-xs text-muted-foreground">{s.status}</span>
              </div>
            ))}
            {!q.data?.length && <div className="py-6 text-center text-muted-foreground">No subscriptions yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
