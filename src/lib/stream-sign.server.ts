import { createHmac, timingSafeEqual } from "crypto";

// HMAC-signed short-lived tokens for stream URLs.
// Real upstream URLs never reach the browser.

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function getSecret(): string {
  const s = process.env.STREAM_SIGNING_SECRET;
  if (!s) throw new Error("STREAM_SIGNING_SECRET is not configured");
  return s;
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function hmac(payload: string): string {
  return b64url(createHmac("sha256", getSecret()).update(payload).digest());
}

// Sign a stream id (entry point — protects DB lookup)
export function signStreamId(id: string, ttlMs = TOKEN_TTL_MS): { exp: number; sig: string } {
  const exp = Date.now() + ttlMs;
  const sig = hmac(`id:${id}:${exp}`);
  return { exp, sig };
}

export function verifyStreamId(id: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = hmac(`id:${id}:${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}

// Sign an arbitrary upstream URL (used for HLS segments / nested playlists)
export function signUpstream(url: string, ttlMs = TOKEN_TTL_MS): string {
  const exp = Date.now() + ttlMs;
  const u = b64url(url);
  const sig = hmac(`u:${u}:${exp}`);
  return `u=${u}&exp=${exp}&sig=${sig}`;
}

export function verifyUpstream(uEncoded: string, exp: number, sig: string): string | null {
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = hmac(`u:${uEncoded}:${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    return b64urlDecode(uEncoded).toString("utf8");
  } catch {
    return null;
  }
}

// Rewrite an .m3u8 playlist so every URI line points back through our proxy.
export function rewriteM3U8(text: string, baseUrl: string, proxyBase: string): string {
  const base = new URL(baseUrl);
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { out.push(line); continue; }
    if (trimmed.startsWith("#")) {
      // Rewrite URI="..." inside tags like EXT-X-KEY, EXT-X-MEDIA, EXT-X-MAP
      out.push(line.replace(/URI="([^"]+)"/g, (_m, uri) => {
        const abs = new URL(uri, base).toString();
        return `URI="${proxyBase}?${signUpstream(abs)}"`;
      }));
      continue;
    }
    // A bare URI line (segment or sub-playlist)
    const abs = new URL(trimmed, base).toString();
    out.push(`${proxyBase}?${signUpstream(abs)}`);
  }
  return out.join("\n");
}
