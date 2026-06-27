import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHost, getRequestHeader } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

export type AccessType = "free" | "premium" | "ads" | "mix";

export type MatchAccess = {
  fixture_id: number;
  access: AccessType;
  price_cents: number;
  currency: string;
  hasAccess: boolean;
  available_from: string | null;
  isAvailable: boolean;
};

function normalizeAccess(v: string | null | undefined): AccessType {
  if (v === "paid") return "premium";
  if (v === "premium" || v === "ads" || v === "mix") return v;
  return "free";
}

async function getReadClient() {
  const { getServerEnv } = await import("@/lib/env.server");
  if (getServerEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  }

  return createClient<Database>(
    getServerEnv("SUPABASE_URL") ?? getServerEnv("VITE_SUPABASE_URL")!,
    getServerEnv("SUPABASE_PUBLISHABLE_KEY") ?? getServerEnv("VITE_SUPABASE_PUBLISHABLE_KEY")!,
    {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

async function getUserClient(token: string) {
  const { getServerEnv } = await import("@/lib/env.server");
  return createClient<Database>(
    getServerEnv("SUPABASE_URL") ?? getServerEnv("VITE_SUPABASE_URL")!,
    getServerEnv("SUPABASE_PUBLISHABLE_KEY") ?? getServerEnv("VITE_SUPABASE_PUBLISHABLE_KEY")!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    },
  );
}

// Public: read access info + whether current user has purchased.
export const getMatchAccess = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ fixtureId: z.number() }).parse(input))
  .handler(async ({ data }): Promise<MatchAccess> => {
    const readClient = await getReadClient();
    const { data: row, error } = await readClient
      .from("match_access")
      .select("fixture_id, access, price_cents, currency, available_from")
      .eq("fixture_id", data.fixtureId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const access = normalizeAccess(row?.access as string | null | undefined);
    const price_cents = row?.price_cents ?? 0;
    const currency = row?.currency ?? "usd";
    const available_from = (row?.available_from as string | null | undefined) ?? null;
    const isAvailable = !available_from || new Date(available_from).getTime() <= Date.now();

    // Determine signed-in user from bearer token (optional).
    const gated = access === "premium";
    let hasAccess = !gated;
    if (gated) {
      const auth = getRequestHeader("authorization") ?? "";
      const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
      if (token) {
        const userClient = await getUserClient(token);
        const { data: userRes } = await userClient.auth.getUser(token);
        const uid = userRes?.user?.id;
        if (uid) {
          const nowIso = new Date().toISOString();
          const { data: subscription } = await userClient
            .from("subscriptions")
            .select("id")
            .eq("user_id", uid)
            .eq("status", "active")
            .neq("plan", "free")
            .or(`current_period_end.is.null,current_period_end.gt.${nowIso}`)
            .maybeSingle();

          if (subscription) {
            hasAccess = true;
          } else {
            const { data: purchase } = await userClient
              .from("match_purchases")
              .select("id")
              .eq("user_id", uid)
              .eq("fixture_id", data.fixtureId)
              .eq("status", "paid")
              .maybeSingle();
            hasAccess = Boolean(purchase);
          }
        }
      }

    }

    return { fixture_id: data.fixtureId, access, price_cents, currency, hasAccess, available_from, isAvailable };
  });

// Admin: upsert access for a fixture.
export const setMatchAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      fixture_id: z.number().int().positive(),
      access: z.enum(["free", "premium", "ads", "mix"]),
      price_cents: z.number().int().min(0).default(0),
      currency: z.string().min(3).max(3).default("usd"),
      available_from: z.string().datetime().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("match_access")
      .upsert(
        {
          fixture_id: data.fixture_id,
          access: data.access,
          price_cents: data.access === "premium" ? data.price_cents : 0,
          currency: data.currency.toLowerCase(),
          available_from: data.available_from ?? null,
        },
        { onConflict: "fixture_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Authenticated: create Stripe Checkout session for this fixture.
export const createMatchCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ fixtureId: z.number().int().positive() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getServerEnv } = await import("@/lib/env.server");
    const stripeKey = getServerEnv("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe is not configured");
    if (!/^sk_(test|live)_/.test(stripeKey) && !/^rk_(test|live)_/.test(stripeKey)) {
      throw new Error(
        `STRIPE_SECRET_KEY has the wrong format (starts with "${stripeKey.slice(0, 6)}…"). ` +
          `It must start with sk_test_ or sk_live_. Update the secret in Project Settings.`,
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: acc } = await supabaseAdmin
      .from("match_access")
      .select("access, price_cents, currency")
      .eq("fixture_id", data.fixtureId)
      .maybeSingle();
    if (!acc || !(acc.access === "premium" || acc.access === "paid")) throw new Error("This match is not a paid match");
    if (!acc.price_cents || acc.price_cents < 50) throw new Error("Invalid price");

    // Already purchased?
    const { data: existing } = await supabaseAdmin
      .from("match_purchases")
      .select("id")
      .eq("user_id", context.userId)
      .eq("fixture_id", data.fixtureId)
      .eq("status", "paid")
      .maybeSingle();
    if (existing) return { url: null, alreadyPurchased: true as const };

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const host = getRequestHost();
    const proto = host?.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: context.claims?.email as string | undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: acc.currency,
            unit_amount: acc.price_cents,
            product_data: { name: `Live match access — Fixture #${data.fixtureId}` },
          },
        },
      ],
      metadata: {
        fixture_id: String(data.fixtureId),
        user_id: context.userId,
      },
      success_url: `${origin}/match/${data.fixtureId}?purchase=success`,
      cancel_url: `${origin}/match/${data.fixtureId}?purchase=cancel`,
    });

    return { url: session.url, alreadyPurchased: false as const };
  });

// Subscription/plan checkout (one-time payment for N months of access).
const PLAN_CATALOG: Record<string, { name: string; price_cents: number; months: number }> = {
  "1m":  { name: "1 Month Pass",  price_cents: 1500, months: 1 },
  "3m":  { name: "3 Month Pass",  price_cents: 4200, months: 3 },
  "6m":  { name: "6 Month Pass",  price_cents: 6000, months: 6 },
  "12m": { name: "12 Month Pass", price_cents: 7200, months: 12 },
};

export const createPlanCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ planId: z.enum(["1m", "3m", "6m", "12m"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { getServerEnv } = await import("@/lib/env.server");
    const stripeKey = getServerEnv("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe is not configured");
    if (!/^sk_(test|live)_/.test(stripeKey) && !/^rk_(test|live)_/.test(stripeKey)) {
      throw new Error(
        `STRIPE_SECRET_KEY has the wrong format (starts with "${stripeKey.slice(0, 6)}…"). ` +
          `It must start with sk_test_ or sk_live_. Update the secret in Project Settings.`,
      );
    }

    const plan = PLAN_CATALOG[data.planId];
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey);

    const host = getRequestHost();
    const proto = host?.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: context.claims?.email as string | undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: plan.price_cents,
            product_data: { name: plan.name, description: `${plan.months} month streaming pass` },
          },
        },
      ],
      metadata: {
        plan_id: data.planId,
        plan_months: String(plan.months),
        user_id: context.userId,
      },
      success_url: `${origin}/pricing?purchase=success`,
      cancel_url: `${origin}/pricing?purchase=cancel`,
    });

    return { url: session.url };
  });
