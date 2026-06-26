import { Link, useNavigate } from "@tanstack/react-router";
import { Search, LogOut, Shield, User as UserIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const NAV: { to: string; label: string; exact?: boolean }[] = [
  { to: "/", label: "Home", exact: true },
  { to: "/live", label: "Live" },
  { to: "/schedule", label: "Matches" },
  { to: "/world-cup", label: "World Cup" },
  { to: "/leagues", label: "Leagues" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: isAdmin = false } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });

  const displayName =
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name ||
    (user?.user_metadata as { name?: string } | undefined)?.name ||
    user?.email?.split("@")[0] ||
    "Account";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-1 font-display text-2xl sm:text-3xl tracking-wide">
          <span className="text-primary">FOOTY</span>
          <span className="text-foreground">STREAM</span>
        </Link>

        <nav className="mx-auto hidden md:flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1.5 text-sm font-medium">
          {NAV.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "bg-primary text-primary-foreground shadow-sm" }}
              activeOptions={{ exact: l.exact ?? false }}
              className="rounded-full px-5 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground transition-colors" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          {user ? (
            <>
              {isAdmin ? (
                <Link
                  to="/admin"
                  className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-4 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
                >
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              ) : (
                <span
                  title={user.email ?? undefined}
                  className="hidden sm:inline-flex h-10 max-w-[200px] items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-4 text-sm font-semibold text-foreground"
                >
                  <UserIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{displayName}</span>
                </span>
              )}
              <button
                onClick={signOut}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden sm:inline-flex h-10 items-center rounded-full border border-border/60 bg-card/60 px-5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
