import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHost, getRequestHeader } from "@tanstack/react-start/server";

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

// Public: read access info + whether current user has purchased.
export const getMatchAccess = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ fixtureId: z.number() }).parse(input))
  .handler(async ({ data }): Promise<MatchAccess> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("match_access")
      .select("fixture_id, access, price_cents, currency, available_from")
      .eq("fixture_id", data.fixtureId)
      .maybeSingle();

    const access = (row?.access ?? "free") as "free" | "paid";
    const price_cents = row?.price_cents ?? 0;
    const currency = row?.currency ?? "usd";
    const available_from = (row?.available_from as string | null | undefined) ?? null;
    const isAvailable = !available_from || new Date(available_from).getTime() <= Date.now();

    // Determine signed-in user from bearer token (optional).
    let hasAccess = access === "free";
    if (!hasAccess) {
      const auth = getRequestHeader("authorization") ?? "";
      const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
      if (token) {
        const { data: userRes } = await supabaseAdmin.auth.getUser(token);
        const uid = userRes?.user?.id;
        if (uid) {
          const { data: purchase } = await supabaseAdmin
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

    return { fixture_id: data.fixtureId, access, price_cents, currency, hasAccess, available_from, isAvailable };
  });

// Admin: upsert access for a fixture.
export const setMatchAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      fixture_id: z.number().int().positive(),
      access: z.enum(["free", "paid"]),
      price_cents: z.number().int().min(0).default(0),
      currency: z.string().min(3).max(3).default("usd"),
      available_from: z.string().datetime().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("match_access")
      .upsert(
        {
          fixture_id: data.fixture_id,
          access: data.access,
          price_cents: data.access === "paid" ? data.price_cents : 0,
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
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("Stripe is not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: acc } = await supabaseAdmin
      .from("match_access")
      .select("access, price_cents, currency")
      .eq("fixture_id", data.fixtureId)
      .maybeSingle();
    if (!acc || acc.access !== "paid") throw new Error("This match is not a paid match");
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
