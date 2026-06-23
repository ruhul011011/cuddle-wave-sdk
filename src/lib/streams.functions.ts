import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type StreamRow = {
  id: string;
  fixture_id: number;
  label: string;
  stream_type: "hls" | "iframe" | "mp4";
  quality: string;
  url: string;
  is_active: boolean;
};

// Public: get active streams for a fixture.
// Uses the admin client server-side because match_streams SELECT is
// restricted to authenticated users at the RLS layer.
export const getStreamsForFixture = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ fixtureId: z.number() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("match_streams")
      .select("id, fixture_id, label, stream_type, quality, url, is_active")
      .eq("fixture_id", data.fixtureId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as StreamRow[];
  });

// Public: list distinct fixture_ids that have at least one active stream.
// Uses the admin client server-side to bypass auth-only RLS on match_streams
// (only fixture_ids are returned — no URLs).
export const listStreamedFixtureIds = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("match_streams")
      .select("id, fixture_id, label, stream_type, quality, url, is_active")
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
});

// Admin: create
export const createStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => streamInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: row, error } = await context.supabase
      .from("match_streams")
      .insert({ ...data, created_by: context.userId })
      .select("id, fixture_id, label, stream_type, quality, url, is_active")
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
        }),
      ).min(1),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const rows = data.streams.map((s) => ({
      ...s,
      fixture_id: data.fixture_id,
      is_active: true,
      created_by: context.userId,
    }));
    const { data: inserted, error } = await context.supabase
      .from("match_streams")
      .insert(rows)
      .select("id, fixture_id, label, stream_type, quality, url, is_active");
    if (error) throw new Error(error.message);
    return (inserted ?? []) as StreamRow[];
  });

// Admin: delete
export const deleteStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("match_streams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Check if current user is admin
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data) };
  });
