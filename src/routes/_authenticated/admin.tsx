import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkIsAdmin } from "@/lib/streams.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Tv, Flame, Trophy, Users, Bell, MessageSquare, Star,
  UsersRound, CreditCard, BarChart3, LifeBuoy, PlayCircle, Crown, Lightbulb,
  LogOut, Shield, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV: Array<{ to: string; label: string; icon: any; exact?: boolean }> = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/live-matches", label: "Live Matches", icon: Tv },
  { to: "/admin/hot-matches", label: "Hot Matches", icon: Flame },
  { to: "/admin/top-leagues", label: "Top Leagues", icon: Trophy },
  { to: "/admin/top-teams", label: "Top Teams", icon: Users },
  { to: "/admin/notification", label: "Notification", icon: Bell },
  { to: "/admin/client-query", label: "Client Query", icon: MessageSquare },
  { to: "/admin/ratings", label: "Ratings", icon: Star },
  { to: "/admin/users", label: "All Users", icon: UsersRound },
  { to: "/admin/transactions", label: "Transactions", icon: CreditCard },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/support", label: "Support", icon: LifeBuoy },
  { to: "/admin/watch-live", label: "Watch-live analytics", icon: PlayCircle },
  { to: "/admin/subscriptions", label: "Subscription analytics", icon: Crown },
  { to: "/admin/insights", label: "Dashboard insights", icon: Lightbulb },
];

function AdminLayout() {
  const navigate = useNavigate();
  const checkAdminFn = useServerFn(checkIsAdmin);
  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkAdminFn() });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (adminQ.isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!adminQ.data?.isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="max-w-md rounded-2xl border border-border/60 bg-card p-8 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-display text-2xl">Admin access required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn't have the <code className="bg-secondary px-1 rounded">admin</code> role.
            Ask an existing admin to grant it.
          </p>
          <Link to="/" className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Back to site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-border/60 bg-card/40">
        <div className="h-16 flex items-center px-6 border-b border-border/60">
          <Link to="/" className="font-display text-xl">
            <span className="text-primary">FOOTY</span><span>ADMIN</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact ?? false }}
              activeProps={{ className: "bg-primary/15 text-primary" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="m-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary/60">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="h-16 sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/60 bg-background/85 backdrop-blur px-4 sm:px-8">
          <div className="md:hidden">
            <select
              className="input-base bg-card text-sm"
              onChange={(e) => navigate({ to: e.target.value as any })}
            >
              {NAV.map((n) => <option key={n.to} value={n.to}>{n.label}</option>)}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground hidden sm:inline">Admin</span>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground font-semibold">
              A
            </div>
          </div>
        </div>
        <main className="p-4 sm:p-8 max-w-[1400px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
