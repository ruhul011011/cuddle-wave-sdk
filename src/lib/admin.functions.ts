import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getServerEnv } from "@/lib/env.server";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: adminRole } = await context.supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!adminRole) throw new Error("Forbidden");
}

// Admin user listing now goes through the `list_app_users` SECURITY DEFINER
// RPC, which checks `has_role(auth.uid(), 'admin')` server-side. This works
// with the user's bearer token alone — no service role key required on the
// self-hosted server.
async function adminListUsers(
  context: { supabase: any },
): Promise<{
  users: Array<{ id: string; email: string | null; created_at: string; last_sign_in_at: string | null }>;
  total: number;
}> {
  const { data, error } = await context.supabase.rpc("list_app_users");
  if (error) throw new Error(`list_app_users failed: ${error.message}`);
  const users = (data ?? []) as Array<{
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
  }>;
  return { users, total: users.length };
}


// ============== DASHBOARD STATS ==============
export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [streams, hot, leagues, teams, queries, ratings, txns, subs, notifs] =
      await Promise.all([
        supabaseAdmin.from("match_streams").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("hot_matches").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("top_leagues").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("top_teams").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("client_queries").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("ratings").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("transactions").select("amount, status, created_at"),
        supabaseAdmin.from("subscriptions").select("plan, status", { count: "exact" }),
        supabaseAdmin.from("notifications").select("id", { count: "exact", head: true }),
      ]);

    const { total: totalUsers } = await adminListUsers(1000);

    const { count: adminCount } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    const txData = txns.data ?? [];
    const succeeded = txData.filter((t: any) => t.status === "succeeded");
    const totalRevenue = succeeded.reduce((a: number, t: any) => a + Number(t.amount ?? 0), 0);
    const premiumUsers = (subs.data ?? []).filter((s: any) => s.plan !== "free" && s.status === "active").length;

    return {
      liveMatches: streams.count ?? 0,
      hotMatches: hot.count ?? 0,
      topLeagues: leagues.count ?? 0,
      topTeams: teams.count ?? 0,
      totalUsers,
      premiumUsers,
      totalAdmins: adminCount ?? 0,
      successfulDeposits: succeeded.length,
      totalTransactions: txData.length,
      totalRevenue,
      clientQueries: queries.count ?? 0,
      ratings: ratings.count ?? 0,
      notifications: notifs.count ?? 0,
    };
  });

export const getRevenueSeries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabaseAdmin
      .from("transactions")
      .select("amount, created_at, status")
      .gte("created_at", since);
    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const t of data ?? []) {
      if (t.status !== "succeeded") continue;
      const k = (t.created_at as string).slice(0, 10);
      if (k in buckets) buckets[k] += Number(t.amount);
    }
    return Object.entries(buckets).map(([date, value]) => ({ date, value }));
  });

export const getSignupSeries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { users } = await adminListUsers(1000);
    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const u of users) {
      const k = (u.created_at as string).slice(0, 10);
      if (k in buckets) buckets[k] += 1;
    }
    return Object.entries(buckets).map(([date, value]) => ({ date, value }));
  });

// ============== USERS ==============
export const listAuthUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { users } = await adminListUsers(1000);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      roles: roleMap.get(u.id) ?? [],
    }));
  });

export const toggleUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), make_admin: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.make_admin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", "admin");
    }
    return { ok: true };
  });

// ============== HOT MATCHES ==============
export const listHotMatches = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("hot_matches").select("*").order("sort_order").order("created_at", { ascending: false });
  return data ?? [];
});
export const addHotMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ fixture_id: z.number().int().positive(), title: z.string().optional(), sort_order: z.number().int().default(0) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("hot_matches").insert({ ...data, created_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const deleteHotMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("hot_matches").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== TOP LEAGUES ==============
export const listTopLeagues = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("top_leagues").select("*").order("sort_order");
  return data ?? [];
});
export const addTopLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    league_id: z.number().int().positive(),
    name: z.string().min(1),
    country: z.string().optional(),
    logo: z.string().url().optional(),
    sort_order: z.number().int().default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("top_leagues").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const updateTopLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    league_id: z.number().int().positive().optional(),
    name: z.string().min(1).optional(),
    country: z.string().optional().nullable(),
    logo: z.string().url().optional().nullable().or(z.literal("")),
    sort_order: z.number().int().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;
    if (patch.logo === "") patch.logo = null;
    const { error } = await context.supabase.from("top_leagues").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const deleteTopLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("top_leagues").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== TOP TEAMS ==============
export const listTopTeams = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("top_teams").select("*").order("sort_order");
  return data ?? [];
});
export const addTopTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    team_id: z.number().int().positive(),
    name: z.string().min(1),
    logo: z.string().url().optional(),
    sort_order: z.number().int().default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("top_teams").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const deleteTopTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("top_teams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== NOTIFICATIONS ==============
export const listNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  return data ?? [];
});
export const addNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(1000),
    audience: z.enum(["all", "premium", "free"]).default("all"),
    link: z.string().url().optional().or(z.literal("")),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("notifications").insert({
      title: data.title,
      body: data.body,
      audience: data.audience,
      link: data.link || null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("notifications").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== CLIENT QUERIES ==============
export const submitClientQuery = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    subject: z.string().trim().min(1).max(150),
    message: z.string().trim().min(5).max(2000),
  }).parse(d))
  .handler(async ({ data }) => {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const { createClient } = await import("@supabase/supabase-js");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    const authHeader = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token && process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
      const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: u } = await client.auth.getUser();
      userId = u.user?.id ?? null;
    }

    const { error } = await supabaseAdmin.from("client_queries").insert({ ...data, user_id: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const listClientQueries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("client_queries").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
export const updateClientQueryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["open", "answered", "closed"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("client_queries").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== RATINGS / TRANSACTIONS / SUBS ==============
export const listRatings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("ratings").select("*").order("created_at", { ascending: false }).limit(200);
    return data ?? [];
  });
export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
    return data ?? [];
  });
export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(500);
    return data ?? [];
  });
