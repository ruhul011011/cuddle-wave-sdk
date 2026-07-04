import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  if (response.headers.get("x-tss-serialized") === "true") return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function getRuntimeEnvValue(env: unknown, key: string): string | undefined {
  if (env && typeof env === "object" && key in env) {
    const value = (env as Record<string, unknown>)[key];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function handleLegacyLovableOAuth(request: Request, env: unknown): Response | undefined {
  const url = new URL(request.url);
  if (url.pathname !== "/~oauth/initiate") return undefined;

  const provider = url.searchParams.get("provider") || "google";
  if (provider !== "google") {
    return Response.redirect(`${url.origin}/auth`, 302);
  }

  const backendUrl =
    getRuntimeEnvValue(env, "SUPABASE_URL") ||
    getRuntimeEnvValue(env, "VITE_SUPABASE_URL") ||
    getRuntimeEnvValue(env, "PUBLIC_SUPABASE_URL") ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.PUBLIC_SUPABASE_URL;

  if (!backendUrl) {
    return Response.redirect(`${url.origin}/auth`, 302);
  }

  const authorizeUrl = new URL("/auth/v1/authorize", backendUrl);
  authorizeUrl.searchParams.set("provider", "google");
  authorizeUrl.searchParams.set("redirect_to", `${url.origin}/auth/callback`);

  return Response.redirect(authorizeUrl.toString(), 302);
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const oauthResponse = handleLegacyLovableOAuth(request, env);
      if (oauthResponse) return oauthResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      if (request.headers.get("x-tsr-serverFn") === "true") {
        throw error;
      }
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
