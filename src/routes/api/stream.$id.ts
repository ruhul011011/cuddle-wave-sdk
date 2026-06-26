import { createFileRoute } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "transfer-encoding", "upgrade",
  "proxy-authenticate", "proxy-authorization", "te", "trailers",
  "content-encoding", "content-length",
]);

const UPSTREAM_TIMEOUT_MS = 20_000;

function passHeaders(src: Headers): Headers {
  const h = new Headers();
  src.forEach((v, k) => { if (!HOP_BY_HOP.has(k.toLowerCase())) h.set(k, v); });
  // No CORS needed (same-origin), but be permissive for media
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Cache-Control", "no-store");
  return h;
}

async function fetchUpstream(url: string, request: Request): Promise<Response> {
  const u = new URL(url);
  const forward = new Headers();
  // Forward Range for video seeking
  const range = request.headers.get("range");
  if (range) forward.set("range", range);
  // Some CDNs require a referer/origin matching the source
  forward.set("referer", `${u.protocol}//${u.host}/`);
  forward.set("origin", `${u.protocol}//${u.host}`);
  forward.set("user-agent", request.headers.get("user-agent") ?? "Mozilla/5.0");
  forward.set("cache-control", "no-cache");
  forward.set("pragma", "no-cache");
  return fetch(url, {
    headers: forward,
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

export const Route = createFileRoute("/api/stream/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const exp = Number(url.searchParams.get("exp"));
        const sig = url.searchParams.get("sig") ?? "";

        const { verifyStreamId, signUpstream, rewriteM3U8 } = await import(
          "@/lib/stream-sign.server"
        );
        if (!verifyStreamId(params.id, exp, sig)) {
          return new Response("Forbidden", { status: 403 });
        }

        const { getServerEnv } = await import("@/lib/env.server");
        let db;
        if (getServerEnv("SUPABASE_SERVICE_ROLE_KEY")) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          db = supabaseAdmin;
        } else {
          const { createClient } = await import("@supabase/supabase-js");
          db = createClient<Database>(
            getServerEnv("SUPABASE_URL") ?? getServerEnv("VITE_SUPABASE_URL")!,
            getServerEnv("SUPABASE_PUBLISHABLE_KEY") ?? getServerEnv("VITE_SUPABASE_PUBLISHABLE_KEY")!,
            {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
            },
          );
        }
        const { data: row, error } = await db
          .from("match_streams")
          .select("url, stream_type, is_active")
          .eq("id", params.id)
          .maybeSingle();

        if (error || !row || !row.is_active) {
          return new Response("Not found", { status: 404 });
        }
        if (row.stream_type !== "hls" && row.stream_type !== "mp4") {
          return new Response("Unsupported", { status: 400 });
        }

        // Do not proxy MP4/progressive streams through the serverless route: those
        // requests can stay open for minutes and get terminated by the runtime.
        // Redirecting keeps long-running media playback in the browser instead.
        if (row.stream_type === "mp4") {
          return new Response(null, {
            status: 302,
            headers: {
              Location: row.url,
              "Cache-Control": "no-store",
            },
          });
        }

        let upstream: Response;
        try {
          upstream = await fetchUpstream(row.url, request);
        } catch {
          return new Response("Upstream stream timed out", {
            status: 504,
            headers: { "Cache-Control": "no-store" },
          });
        }
        const headers = passHeaders(upstream.headers);
        const ct = (upstream.headers.get("content-type") || "").toLowerCase();
        const looksHls = row.stream_type === "hls" || ct.includes("mpegurl") || row.url.toLowerCase().includes(".m3u8");

        if (looksHls && upstream.ok) {
          const text = await upstream.text();
          const proxyBase = `${url.origin}/api/stream/seg`;
          const rewritten = rewriteM3U8(text, row.url, proxyBase);
          headers.set("content-type", "application/vnd.apple.mpegurl");
          return new Response(rewritten, { status: upstream.status, headers });
        }

        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});
