import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/admin.functions";
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/insights")({
  component: InsightsPage,
});

function InsightsPage() {
  const statsFn = useServerFn(getAdminStats);
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => statsFn() });
  const s = stats.data;

  const insights = [
    s && s.liveMatches === 0 && { icon: AlertCircle, tone: "text-amber-400", text: "No live streams configured. Add streams in Live Matches to start broadcasting." },
    s && s.hotMatches === 0 && { icon: AlertCircle, tone: "text-amber-400", text: "No hot matches highlighted. Mark popular fixtures as hot to feature them." },
    s && s.totalUsers > 0 && s.premiumUsers === 0 && { icon: Lightbulb, tone: "text-sky-400", text: `${s.totalUsers} users registered but 0 premium conversions yet. Consider a promo notification.` },
    s && s.clientQueries > 0 && { icon: AlertCircle, tone: "text-rose-400", text: `${s.clientQueries} client queries pending — review the Client Query tab.` },
    s && s.totalAdmins < 2 && { icon: Lightbulb, tone: "text-sky-400", text: "Only one admin account. Consider adding a backup admin." },
    s && s.totalRevenue > 0 && { icon: TrendingUp, tone: "text-emerald-400", text: `$${s.totalRevenue.toFixed(2)} in total revenue collected to date.` },
  ].filter(Boolean) as Array<{ icon: any; tone: string; text: string }>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl flex items-center gap-3"><Lightbulb className="h-7 w-7 text-primary" /> Dashboard insights</h1>
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
        {insights.map((i, idx) => (
          <div key={idx} className="p-4 flex items-start gap-3 text-sm">
            <i.icon className={`h-5 w-5 mt-0.5 ${i.tone}`} />
            <span>{i.text}</span>
          </div>
        ))}
        {!insights.length && (
          <div className="p-6 flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Everything looks good.
          </div>
        )}
      </div>
    </div>
  );
}
