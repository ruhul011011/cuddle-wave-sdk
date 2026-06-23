import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats, getRevenueSeries, getSignupSeries } from "@/lib/admin.functions";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const statsFn = useServerFn(getAdminStats);
  const revFn = useServerFn(getRevenueSeries);
  const sigFn = useServerFn(getSignupSeries);
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => statsFn() });
  const rev = useQuery({ queryKey: ["admin", "revenue"], queryFn: () => revFn() });
  const sig = useQuery({ queryKey: ["admin", "signups"], queryFn: () => sigFn() });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Analytics</h1>
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="Users" value={stats.data?.totalUsers ?? "—"} />
        <Stat label="Premium" value={stats.data?.premiumUsers ?? "—"} />
        <Stat label="Streams live" value={stats.data?.liveMatches ?? "—"} />
        <Stat label="Revenue" value={stats.data ? `$${stats.data.totalRevenue.toFixed(2)}` : "—"} />
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="font-display text-lg mb-3">Revenue · last 7 days</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={rev.data ?? []}>
            <defs>
              <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.66 0.24 18)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="oklch(0.66 0.24 18)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,140,0.15)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "rgb(20,20,30)", border: "1px solid rgba(120,120,140,0.3)", borderRadius: 8 }} />
            <Area type="monotone" dataKey="value" stroke="oklch(0.66 0.24 18)" fill="url(#rev)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="font-display text-lg mb-3">Signups · last 7 days</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={sig.data ?? []}>
            <defs>
              <linearGradient id="sig" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.7 0.18 160)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="oklch(0.7 0.18 160)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,140,0.15)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "rgb(20,20,30)", border: "1px solid rgba(120,120,140,0.3)", borderRadius: 8 }} />
            <Area type="monotone" dataKey="value" stroke="oklch(0.7 0.18 160)" fill="url(#sig)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}
