import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-display text-lg">
            FS
          </div>
          <span className="font-display text-xl tracking-wide">
            FOOTBALL <span className="text-primary">STREAMING</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {[
            { to: "/", label: "Home" },
            { to: "/live", label: "Live" },
            { to: "/schedule", label: "Schedule" },
            { to: "/leagues", label: "Leagues" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "bg-secondary text-foreground" }}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button className="grid h-9 w-9 place-items-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          <button className="hidden sm:inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Watch Live
          </button>
        </div>
      </div>
    </header>
  );
}
