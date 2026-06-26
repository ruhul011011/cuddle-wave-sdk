import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// Resolve a server-side Supabase client for public reads.
// Prefers service role (bypasses RLS) when available, otherwise falls back
// to the publishable key (anon role). Self-hosted deployments without
// SUPABASE_SERVICE_ROLE_KEY rely on the public RLS policies to read
// free/ads/mix streams.
async function getReadClient() {
  const { getServerEnv } = await import("@/lib/env.server");
  if (getServerEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  }
  const url = getServerEnv("SUPABASE_URL") ?? getServerEnv("VITE_SUPABASE_URL")!;
  const key = getServerEnv("SUPABASE_PUBLISHABLE_KEY") ?? getServerEnv("VITE_SUPABASE_PUBLISHABLE_KEY")!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}


export type StreamRow = {
  id: string;
  fixture_id: number;
  label: string;
  stream_type: "hls" | "iframe" | "mp4";
  quality: string;
  url: string;
  is_active: boolean;
  link_mode: "free" | "premium" | "ads";
};

// Authenticated: get active streams for a fixture, gated by Access Type:
//  - free  → all links visible to signed-in users
//  - ads   → all links visible to signed-in users (ad-supported)
//  - premium → all links hidden unless the caller purchased
//  - mix   → free/ads links visible; premium links hidden unless purchased
export const getStreamsForFixture = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ fixtureId: z.number() }).parse(input))
  .handler(async ({ data, context }) => {
    // Use the authenticated Supabase client from the request context.
    // On the VPS there is often no SUPABASE_SERVICE_ROLE_KEY, so a fresh
    // server-side anon client cannot read auth-only RLS policies even after
    // the user signs in. context.supabase carries the user's bearer token.
    const supabase = context.supabase;
    const callerUserId = context.userId;



    const { data: acc } = await supabase
      .from("match_access")
      .select("access, available_from")
      .eq("fixture_id", data.fixtureId)
      .maybeSingle();

    // Normalize access (legacy 'paid' === 'premium').
    const rawAccess = (acc?.access ?? "free") as string;
    const access: "free" | "premium" | "ads" | "mix" =
      rawAccess === "paid" ? "premium"
      : (rawAccess === "premium" || rawAccess === "ads" || rawAccess === "mix") ? rawAccess
      : "free";

    // Scheduled go-live: hide everything until available_from has passed.
    if (acc?.available_from && new Date(acc.available_from as string).getTime() > Date.now()) {
      return [] as StreamRow[];
    }

    // Resolve caller purchase status (all callers are authenticated here).
    let hasPurchase = false;
    if (access === "premium" || access === "mix") {
      const { data: purchase } = await supabase
        .from("match_purchases")
        .select("id")
        .eq("user_id", callerUserId)
        .eq("fixture_id", data.fixtureId)
        .eq("status", "paid")
        .maybeSingle();
      hasPurchase = Boolean(purchase);
    }


    // Premium fixture: zero links until purchase.
    if (access === "premium" && !hasPurchase) return [] as StreamRow[];

    const { data: rows, error } = await supabase
      .from("match_streams")
      .select("id, fixture_id, label, stream_type, quality, url, is_active, link_mode")
      .eq("fixture_id", data.fixtureId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    let result = (rows ?? []) as StreamRow[];

    // Mix fixture: hide premium-tagged links from non-purchasers.
    if (access === "mix" && !hasPurchase) {
      result = result.filter((r) => r.link_mode !== "premium");
    }

    // Replace raw upstream URLs with short-lived encrypted proxy URLs so the
    // real source never reaches the browser. We sign the upstream URL here
    // instead of only signing the stream row ID because media requests do not
    // include the user's Authorization header and many VPS installs do not
    // have a service-role key for a second DB lookup inside /api/stream/*.
    const { signUpstream } = await import("@/lib/stream-sign.server");
    result = result.map((r) => (
      r.stream_type === "iframe"
        ? r
        : { ...r, url: `/api/stream/seg?${signUpstream(r.url)}` }
    ));

    return result;
  });



// Public: list distinct fixture_ids that have at least one active stream.
// Uses the admin client server-side to bypass auth-only RLS on match_streams
// (only fixture_ids are returned — no URLs).
export const listStreamedFixtureIds = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await getReadClient();

  const { data, error } = await supabaseAdmin
    .from("match_streams")
    .select("fixture_id")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  const ids = Array.from(new Set((data ?? []).map((r) => r.fixture_id)));
  return ids;
});

// Admin: list all streams (any fixture)
export const listAllStreams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("match_streams")
      .select("id, fixture_id, label, stream_type, quality, url, is_active, link_mode")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as StreamRow[];
  });

const streamInputSchema = z.object({
  fixture_id: z.number().int().positive(),
  label: z.string().min(1).max(60),
  stream_type: z.enum(["hls", "iframe", "mp4"]),
  quality: z.string().min(1).max(20).default("HD"),
  url: z.string().url(),
  is_active: z.boolean().default(true),
  link_mode: z.enum(["free", "premium", "ads"]).default("free"),
});

// Admin: create
export const createStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => streamInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Forbidden");
    const { data: row, error } = await context.supabase
      .from("match_streams")
      .insert({ ...data, created_by: context.userId })
      .select("id, fixture_id, label, stream_type, quality, url, is_active, link_mode")
      .single();
    if (error) throw new Error(error.message);
    return row as StreamRow;
  });

// Admin: bulk create multiple streams for a fixture
export const bulkCreateStreams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      fixture_id: z.number().int().positive(),
      streams: z.array(
        z.object({
          label: z.string().min(1).max(60).default("Main"),
          stream_type: z.enum(["hls", "iframe", "mp4"]),
          quality: z.string().min(1).max(20).default("HD"),
          url: z.string().url(),
          link_mode: z.enum(["free", "premium", "ads"]).default("free"),
        }),
      ).min(1),
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
    const rows = data.streams.map((s) => ({
      ...s,
      fixture_id: data.fixture_id,
      is_active: true,
      created_by: context.userId,
    }));
    const { data: inserted, error } = await context.supabase
      .from("match_streams")
      .insert(rows)
      .select("id, fixture_id, label, stream_type, quality, url, is_active, link_mode");
    if (error) throw new Error(error.message);
    return (inserted ?? []) as StreamRow[];
  });

// Admin: list streams for a single fixture (used by "copy links" picker)
export const getStreamsByFixture = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ fixtureId: z.number().int().positive() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Forbidden");
    const { data: rows, error } = await context.supabase
      .from("match_streams")
      .select("id, fixture_id, label, stream_type, quality, url, is_active, link_mode")
      .eq("fixture_id", data.fixtureId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as StreamRow[];
  });

// Admin: aggregated list of matches that have streams (with access info)
export type AdminMatchGroup = {
  fixture_id: number;
  link_count: number;
  active_count: number;
  premium_count: number;
  ads_count: number;
  free_count: number;
  access: "free" | "premium" | "ads" | "mix";
  price_cents: number;
  currency: string;
  available_from: string | null;
};

export const listAdminMatchGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminMatchGroup[]> => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Forbidden");

    const { data: streams, error } = await context.supabase
      .from("match_streams")
      .select("fixture_id, is_active, link_mode")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const groupMap = new Map<number, AdminMatchGroup>();
    for (const s of streams ?? []) {
      const g = groupMap.get(s.fixture_id) ?? {
        fixture_id: s.fixture_id,
        link_count: 0,
        active_count: 0,
        premium_count: 0,
        ads_count: 0,
        free_count: 0,
        access: "free" as const,
        price_cents: 0,
        currency: "usd",
        available_from: null,
      };
      g.link_count += 1;
      if (s.is_active) g.active_count += 1;
      const mode = (s.link_mode ?? "free") as string;
      if (mode === "premium") g.premium_count += 1;
      else if (mode === "ads") g.ads_count += 1;
      else g.free_count += 1;
      groupMap.set(s.fixture_id, g);
    }

    const ids = Array.from(groupMap.keys());
    if (ids.length) {
      const { data: accessRows } = await context.supabase
        .from("match_access")
        .select("fixture_id, access, price_cents, currency, available_from")
        .in("fixture_id", ids);
      for (const a of accessRows ?? []) {
        const g = groupMap.get(a.fixture_id);
        if (!g) continue;
        const raw = (a.access ?? "free") as string;
        g.access =
          raw === "paid" ? "premium"
          : raw === "premium" || raw === "ads" || raw === "mix" ? raw
          : "free";
        g.price_cents = a.price_cents ?? 0;
        g.currency = a.currency ?? "usd";
        g.available_from = (a.available_from as string | null) ?? null;
      }
    }
    return Array.from(groupMap.values());
  });

// Admin: delete all streams for a fixture (and clear its access row)
export const deleteFixtureStreams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ fixtureId: z.number().int().positive() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("match_streams")
      .delete()
      .eq("fixture_id", data.fixtureId);
    if (error) throw new Error(error.message);
    await context.supabase.from("match_access").delete().eq("fixture_id", data.fixtureId);
    return { ok: true };
  });

// Admin: delete
export const deleteStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Forbidden");
    const { error } = await context.supabase.from("match_streams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Check if current user is admin
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: Boolean(data) };
  });
