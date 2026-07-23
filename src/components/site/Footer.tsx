import { Twitter, Youtube, Instagram, Facebook, ChevronRight, Play } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  const year = new Date().getFullYear();

  const columns = [
    {
      title: "Fixtures",
      links: [
        { label: "Match Schedule", to: "/schedule" },
        { label: "Live Now", to: "/live" },
        { label: "Leagues", to: "/leagues" },
      ],
    },
    {
      title: "Broadcasting",
      links: [
        { label: "Live Now", to: "/live" },
        { label: "Leagues", to: "/leagues" },
        { label: "Pricing", to: "/pricing" },
        { label: "Contact", to: "/contact" },
        { label: "Sign In", to: "/auth" },
      ],
    },
  ];

  return (
    <footer className="mt-24 relative overflow-hidden border-t border-border/60 bg-background text-muted-foreground">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_20px_-4px_hsl(var(--primary)/0.6)]">
                <Play className="h-5 w-5 fill-current" />
              </div>
              <div className="font-display leading-none">
                <span className="block text-2xl font-bold tracking-tight text-foreground">YALLASTREAM</span>
                <span className="block text-[10px] tracking-[0.32em] text-primary font-semibold mt-1">FOOTBALL LIVE</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Experience football live—streams, scores, fixtures & standings across every major league.
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Twitter, label: "Twitter" },
                { Icon: Facebook, label: "Facebook" },
                { Icon: Instagram, label: "Instagram" },
                { Icon: Youtube, label: "YouTube" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-border/60 flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-foreground font-bold tracking-wider uppercase mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                {col.title}
              </h4>
              <ul className="space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="inline-block hover:text-foreground hover:translate-x-1 transition-all"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Updates panel */}
          <div>
            <h4 className="font-display text-foreground font-bold tracking-wider uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Updates
            </h4>
            <div className="bg-card p-5 rounded-xl border border-border/60">
              <p className="text-[11px] mb-4 text-muted-foreground font-medium uppercase tracking-widest">
                Stay in the game
              </p>
              <form
                className="flex gap-2"
                onSubmit={(e) => e.preventDefault()}
              >
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 bg-background border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold p-2 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </form>
              <div className="mt-4 flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                  Servers: Operational
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/60 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs font-medium tracking-wide flex flex-wrap justify-center gap-6">
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Cookies</a>
          </div>
          <div className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">
            © {year} Yalla Football Live · All rights reserved
          </div>
        </div>
      </div>
    </footer>
  );
}
