import { Trophy, Twitter, Facebook, Instagram, Youtube } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-border/60 bg-gradient-to-b from-card/40 to-card/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-14 pb-10">
        {/* Trophy banner */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-primary/40 rounded-full" aria-hidden />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 shadow-lg shadow-primary/30 ring-4 ring-background">
              <Trophy className="h-10 w-10 text-background" strokeWidth={2.2} />
            </div>
          </div>
          <h3 className="mt-5 font-display text-3xl sm:text-4xl tracking-wide">
            WORLD CUP <span className="text-primary">TV 2026</span>
          </h3>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Your home for every FIFA World Cup 2026 match — live in HD, with schedules,
            fixtures, standings, and highlights from group stage to the final.
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-display text-xl tracking-wide">
              <Trophy className="h-5 w-5 text-primary" />
              <span>WORLD CUP <span className="text-primary">TV</span></span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              Live football streams, World Cup 2026 fixtures, standings and highlights — all in one place.
            </p>
            <div className="mt-4 flex items-center gap-3 text-muted-foreground">
              <a href="#" aria-label="Twitter" className="hover:text-primary transition-colors"><Twitter className="h-4 w-4" /></a>
              <a href="#" aria-label="Facebook" className="hover:text-primary transition-colors"><Facebook className="h-4 w-4" /></a>
              <a href="#" aria-label="Instagram" className="hover:text-primary transition-colors"><Instagram className="h-4 w-4" /></a>
              <a href="#" aria-label="YouTube" className="hover:text-primary transition-colors"><Youtube className="h-4 w-4" /></a>
            </div>
          </div>

          {[
            { title: "Explore", links: [
              { label: "Live Now", to: "/live" },
              { label: "Schedule", to: "/schedule" },
              { label: "World Cup 2026", to: "/world-cup" },
              { label: "Leagues", to: "/leagues" },
            ]},
            { title: "World Cup", links: [
              { label: "Fixtures", to: "/world-cup" },
              { label: "Group Stage", to: "/world-cup" },
              { label: "Knockouts", to: "/world-cup" },
              { label: "Standings", to: "/world-cup" },
            ]},
            { title: "Company", links: [
              { label: "Pricing", to: "/pricing" },
              { label: "Contact", to: "/contact" },
              { label: "Sign In", to: "/auth" },
            ]},
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm tracking-wider text-foreground">{col.title}</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="hover:text-primary transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-center gap-2">
        <Trophy className="h-3.5 w-3.5 text-primary" />
        <span>© {year} World Cup TV 2026. All rights reserved.</span>
      </div>
    </footer>
  );
}
