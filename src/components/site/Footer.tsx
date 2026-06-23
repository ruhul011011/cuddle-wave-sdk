export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="font-display text-xl tracking-wide">
            FOOTBALL <span className="text-primary">STREAMING</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Live football streams, match schedules, and highlights from every major league across the world.
          </p>
        </div>
        {[
          { title: "Explore", links: ["Live Now", "Today's Matches", "Schedule", "Leagues"] },
          { title: "Leagues", links: ["Premier League", "La Liga", "Bundesliga", "Serie A"] },
          { title: "Company", links: ["About", "Contact", "Privacy", "Terms"] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="font-display text-sm tracking-wider text-foreground">{col.title}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {col.links.map((l) => (
                <li key={l}><a href="#" className="hover:text-foreground transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Football Streaming. All rights reserved.
      </div>
    </footer>
  );
}
