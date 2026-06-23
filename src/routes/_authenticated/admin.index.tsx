import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats, getRevenueSeries, getSignupSeries } from "@/lib/admin.functions";
import {
  Tv, Flame, Trophy, Users, UsersRound, Gem, ShieldCheck, Wallet,
  Receipt, DollarSign, HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const statsFn = useServerFn(getAdminStats);
  const revFn = useServerFn(getRevenueSeries);
  const sigFn = useServerFn(getSignupSeries);

  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => statsFn() });
  const rev = useQuery({ queryKey: ["admin", "revenue"], queryFn: () => revFn() });
  const sig = useQuery({ queryKey: ["admin", "signups"], queryFn: () => sigFn() });
  const s = stats.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Home</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard tone="sky" icon={<Tv />} value={s?.liveMatches ?? "—"} label="Live Matches" />
        <StatCard tone="rose" icon={<Flame />} value={s?.hotMatches ?? "—"} label="Hot Matches" />
        <StatCard tone="teal" icon={<Trophy />} value={s?.topLeagues ?? "—"} label="Top Leagues" />
        <StatCard tone="amber" icon={<Users />} value={s?.topTeams ?? "—"} label="Top Teams" />

        <StatCard tone="violet" icon={<UsersRound />} value={s?.totalUsers ?? "—"} label="Total Users" />
        <StatCard tone="emerald" icon={<Gem />} value={s?.premiumUsers ?? "—"} label="Premium Users" />
        <StatCard tone="orange" icon={<ShieldCheck />} value={s?.totalAdmins ?? "—"} label="Total Admins" />
        <StatCard tone="yellow" icon={<Wallet />} value={s?.successfulDeposits ?? "—"} label="Successful Deposits" />

        <StatCard tone="sky" icon={<Receipt />} value={s?.totalTransactions ?? "—"} label="Total Transactions" />
        <StatCard tone="amber" icon={<DollarSign />} value={s ? `$${s.totalRevenue.toFixed(2)}` : "—"} label="Total Revenue" />
        <StatCard tone="sky" icon={<HelpCircle />} value={s?.clientQueries ?? "—"} label="Client Queries" />
      </div>

      <div>
        <h2 className="font-display text-xl mb-3">Package Sales</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <ChartCard title="Transaction Revenue Chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rev.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,140,0.15)" />
                <XAxis dataKey="date" stroke="currentColor" tick={{ fontSize: 11 }} />
                <YAxis stroke="currentColor" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "rgb(20,20,30)", border: "1px solid rgba(120,120,140,0.3)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="oklch(0.66 0.24 18)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="User Signup Chart">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={sig.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,140,0.15)" />
                <XAxis dataKey="date" stroke="currentColor" tick={{ fontSize: 11 }} />
                <YAxis stroke="currentColor" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "rgb(20,20,30)", border: "1px solid rgba(120,120,140,0.3)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="value" stroke="oklch(0.7 0.18 160)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  sky: "bg-sky-500/15 text-sky-400",
  rose: "bg-rose-500/15 text-rose-400",
  teal: "bg-teal-500/15 text-teal-400",
  amber: "bg-amber-500/15 text-amber-400",
  violet: "bg-violet-500/15 text-violet-400",
  emerald: "bg-emerald-500/15 text-emerald-400",
  orange: "bg-orange-500/15 text-orange-400",
  yellow: "bg-yellow-500/15 text-yellow-400",
};

function StatCard({ icon, value, label, tone }: { icon: React.ReactNode; value: React.ReactNode; label: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 flex items-center gap-4">
      <div className={`grid h-12 w-12 place-items-center rounded-full ${TONES[tone] ?? ""}`}>
        <div className="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      </div>
      <div>
        <div className="font-display text-2xl">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg">{title}</h3>
        <span className="text-xs uppercase tracking-wider text-muted-foreground rounded border border-border/60 px-2 py-0.5">Weekly</span>
      </div>
      {children}
    </div>
  );
}
