import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { createPlanCheckout } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Football Streaming" },
      { name: "description", content: "Choose a plan to watch live football streams in HD. 1, 3, 6 and 12 month subscriptions." },
      { property: "og:title", content: "Football Streaming Pricing" },
      { property: "og:description", content: "Simple pricing for live football streaming in HD." },
    ],
  }),
  component: PricingPage,
});

type Plan = {
  id: string;
  name: string;
  price: number;
  oldPrice: number;
  months: number;
  highlight?: boolean;
};

const plans: Plan[] = [
  { id: "12m", name: "12 Month", price: 72, oldPrice: 240, months: 12, highlight: true },
  { id: "1m", name: "1 Month", price: 15, oldPrice: 20, months: 1 },
  { id: "3m", name: "3 Month", price: 42, oldPrice: 60, months: 3 },
  { id: "6m", name: "6 Month", price: 60, oldPrice: 120, months: 6 },
];

const features = [
  "⚽ 100+ Football Leagues & Tournaments",
  "🎙️ English Commentary",
  "🚫 No Ads or Pop-ups",
  "🔒 256-bit Encrypted Security",
  "🕐 24/7 Dedicated Support",
  "📦 Discreet Billing",
  "✅ 100% Safe & Secure",
  "💻📱 Watch on Laptop, Phone, or Tablet",
];

function PricingPage() {
  const [selected, setSelected] = useState("12m");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const checkoutFn = useServerFn(createPlanCheckout);

  async function handleChoose(planId: string) {
    setSelected(planId);
    setLoadingId(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.assign(`/auth?redirect=${encodeURIComponent("/pricing")}`);
        return;
      }
      const res = await checkoutFn({ data: { planId: planId as "1m" | "3m" | "6m" | "12m" } });
      if (res.url) window.location.assign(res.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pricing</div>
          <h1 className="mt-2 font-display text-4xl sm:text-6xl leading-[0.95]">
            ONE PASS. <span className="text-primary">EVERY MATCH.</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Stream every league live in HD. Cancel anytime, no hidden fees.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const perMonth = (p.price / p.months).toFixed(2);
            const save = (p.oldPrice - p.price).toFixed(2);
            const isSelected = selected === p.id;
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  p.highlight
                    ? "border-primary/60 bg-card shadow-[0_0_60px_-20px_oklch(0.66_0.24_18/0.5)]"
                    : "border-border/60 bg-card hover:border-primary/40"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 right-4 rounded-md bg-background border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
                    Most Popular
                  </span>
                )}
                <h2 className="font-display text-2xl">{p.name}</h2>
                <div className="mt-4 flex items-baseline gap-2 flex-wrap">
                  <span className="font-display text-4xl">${p.price}</span>
                  <span className="text-sm text-muted-foreground line-through">${p.oldPrice}</span>
                  <span className="text-sm text-muted-foreground">${perMonth}/month</span>
                </div>
                <div className="mt-1 text-sm text-emerald-400">Save ${save}</div>
                <button
                  onClick={() => setSelected(p.id)}
                  className={`mt-5 inline-flex justify-center rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {isSelected ? "Selected" : "Choose Plan"}
                </button>
                <ul className="mt-6 space-y-3 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-emerald-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
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
