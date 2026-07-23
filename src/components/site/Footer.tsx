import { Twitter, Youtube, Instagram, Facebook, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

function FooterTrophyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      data-footer-trophy
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22 10h20v7c0 10.5-4.2 18-10 18s-10-7.5-10-18v-7Z" fill="currentColor" />
      <path d="M19 14h-8v5c0 8 5.3 14.2 13 15.6" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M45 14h8v5c0 8-5.3 14.2-13 15.6" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 35h8v9h-8z" fill="currentColor" />
      <path d="M21 50h22" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M17 56h30" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M28 15h8" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

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
    <footer className="mt-24 relative overflow-hidden border-t-2 border-[#d4af37]/40 bg-[#060d03] text-zinc-400">
      {/* Top gold glow line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent shadow-[0_0_20px_#d4af37] opacity-60" aria-hidden />
      {/* Radial pitch glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle at 50% -20%, #166534 0%, transparent 60%)" }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 blur-xl bg-[#d4af37]/40 rounded-full" aria-hidden />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#f4cd54] via-[#d4af37] to-[#b8860b] shadow-[0_0_15px_rgba(212,175,55,0.35)]">
                  <FooterTrophyIcon className="h-7 w-7 text-[#111111]" />
                </div>
              </div>
              <div className="font-display leading-none">
                <span className="block text-2xl font-bold tracking-tight text-white">WORLD CUP</span>
                <span className="block text-xs tracking-[0.32em] text-[#d4af37] font-semibold mt-1">LIVE TV 2026</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              The ultimate destination for every FIFA World Cup 2026 match — live in HD with schedules, fixtures, standings, and highlights.
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
                  className="w-9 h-9 rounded-full border border-zinc-800 flex items-center justify-center hover:bg-[#d4af37] hover:text-black hover:border-[#d4af37] transition-all duration-300"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-white font-bold tracking-wider uppercase mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full" />
                {col.title}
              </h4>
              <ul className="space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="inline-block hover:text-white hover:translate-x-1 transition-all"
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
            <h4 className="font-display text-white font-bold tracking-wider uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full" />
              Updates
            </h4>
            <div className="bg-zinc-900/60 p-5 rounded-xl border border-zinc-800">
              <p className="text-[11px] mb-4 text-zinc-500 font-medium uppercase tracking-widest">
                Stay in the game
              </p>
              <form
                className="flex gap-2"
                onSubmit={(e) => e.preventDefault()}
              >
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 bg-[#060d03] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#d4af37] transition-colors"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="bg-[#d4af37] hover:bg-[#b8860b] text-black font-bold p-2 rounded-lg transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </form>
              <div className="mt-4 flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                  Servers: Operational
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs font-medium tracking-wide flex flex-wrap justify-center gap-6">
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
          <div className="text-[11px] font-bold text-zinc-600 tracking-widest uppercase flex items-center gap-2">
            <FooterTrophyIcon className="h-4 w-4 text-[#d4af37]" />
            © {year} World Cup TV 2026 · All rights reserved
          </div>
        </div>
      </div>

      {/* Decorative bottom bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-900 via-[#d4af37] to-emerald-900" aria-hidden />
    </footer>
  );
}
