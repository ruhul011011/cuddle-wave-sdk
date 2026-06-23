import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

const NAV = [
  { to: "/", label: "Home", exact: true },
  { to: "/live", label: "Live" },
  { to: "/schedule", label: "Matches" },
  { to: "/leagues", label: "Leagues" },
] as const;

export function Header() {
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
          <span className="rounded-full px-5 py-2 text-muted-foreground cursor-pointer hover:text-foreground">Pricing</span>
          <span className="rounded-full px-5 py-2 text-muted-foreground cursor-pointer hover:text-foreground">Contact</span>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground transition-colors" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          <button className="hidden sm:inline-flex h-10 items-center rounded-full border border-border/60 bg-card/60 px-5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
            Sign In
          </button>
          <button className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Sign Up
          </button>
        </div>
      </div>
    </header>
  );
}
