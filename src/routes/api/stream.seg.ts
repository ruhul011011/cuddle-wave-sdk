import { createFileRoute } from "@tanstack/react-router";

const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "transfer-encoding", "upgrade",
  "proxy-authenticate", "proxy-authorization", "te", "trailers",
  "content-encoding", "content-length",
]);

function passHeaders(src: Headers): Headers {
  const h = new Headers();
  src.forEach((v, k) => { if (!HOP_BY_HOP.has(k.toLowerCase())) h.set(k, v); });
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Cache-Control", "no-store");
  return h;
}

export const Route = createFileRoute("/api/stream/seg")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const u = url.searchParams.get("u") ?? "";
        const exp = Number(url.searchParams.get("exp"));
        const sig = url.searchParams.get("sig") ?? "";

        const { verifyUpstream, rewriteM3U8 } = await import("@/lib/stream-sign.server");
        const upstreamUrl = verifyUpstream(u, exp, sig);
        if (!upstreamUrl) return new Response("Forbidden", { status: 403 });

        const upHost = new URL(upstreamUrl);
        const forward = new Headers();
        const range = request.headers.get("range");
        if (range) forward.set("range", range);
        forward.set("referer", `${upHost.protocol}//${upHost.host}/`);
        forward.set("origin", `${upHost.protocol}//${upHost.host}`);
        forward.set("user-agent", request.headers.get("user-agent") ?? "Mozilla/5.0");

        const upstream = await fetch(upstreamUrl, { headers: forward, redirect: "follow" });
        const headers = passHeaders(upstream.headers);
        const ct = (upstream.headers.get("content-type") || "").toLowerCase();
        const looksHls = ct.includes("mpegurl") || upstreamUrl.toLowerCase().includes(".m3u8");

        if (looksHls && upstream.ok) {
          const text = await upstream.text();
          const proxyBase = `${url.origin}/api/stream/seg`;
          const rewritten = rewriteM3U8(text, upstreamUrl, proxyBase);
          headers.set("content-type", "application/vnd.apple.mpegurl");
          return new Response(rewritten, { status: upstream.status, headers });
        }

        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});
