import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Check, Zap, Crown, Rocket } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Football Streaming" },
      { name: "description", content: "Choose a plan to watch live football streams in HD. Free, Pro and Ultra tiers." },
      { property: "og:title", content: "Football Streaming Pricing" },
      { property: "og:description", content: "Simple pricing for live football streaming in HD." },
    ],
  }),
  component: PricingPage,
});

type Plan = {
  id: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  icon: React.ReactNode;
  features: string[];
  cta: string;
  highlight?: boolean;
};

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Casual viewing, no card needed.",
    icon: <Zap className="h-5 w-5" />,
    features: [
      "Live scores & fixtures",
      "SD streams with ads",
      "1 device at a time",
      "Standard commentary",
    ],
    cta: "Get started",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$8.99",
    period: "per month",
    tagline: "The fan favourite — every league in HD.",
    icon: <Crown className="h-5 w-5" />,
    features: [
      "Full HD streams, ad-free",
      "All major leagues & cups",
      "3 devices at a time",
      "Multi-language commentary",
      "Replays & highlights",
    ],
    cta: "Start 7-day trial",
    highlight: true,
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "$14.99",
    period: "per month",
    tagline: "4K, multi-cam, zero compromise.",
    icon: <Rocket className="h-5 w-5" />,
    features: [
      "4K HDR streams",
      "Every Pro feature",
      "5 devices at a time",
      "Tactical & multi-cam angles",
      "Priority support",
    ],
    cta: "Go Ultra",
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pricing</div>
          <h1 className="mt-2 font-display text-4xl sm:text-6xl leading-[0.95]">
            ONE PASS. <span className="text-primary">EVERY MATCH.</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Stream every league live in HD. Cancel anytime, no hidden fees.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl border p-7 transition-all ${
                p.highlight
                  ? "border-primary/60 bg-gradient-to-b from-primary/10 to-card shadow-[0_0_60px_-20px_oklch(0.66_0.24_18/0.5)]"
                  : "border-border/60 bg-card hover:border-primary/40"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                  Most Popular
                </span>
              )}
              <div className="flex items-center gap-2 text-primary">
                {p.icon}
                <h2 className="font-display text-2xl">{p.name}</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-5xl">{p.price}</span>
                <span className="text-sm text-muted-foreground">/ {p.period}</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                className={`mt-8 inline-flex justify-center rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                  p.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border/80 bg-card/60 text-foreground hover:bg-secondary"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-border/60 bg-card p-8 text-center">
          <h3 className="font-display text-2xl">Need a custom plan?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Bars, lounges, hotels — get in touch for venue licensing.
          </p>
          <Link
            to="/contact"
            className="mt-5 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Contact sales
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
