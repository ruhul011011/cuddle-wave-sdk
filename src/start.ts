import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    // Never wrap server-function responses in an HTML error page — the client
    // expects a serialized error and would otherwise surface a generic
    // "failed to parse server response" toast even when the DB write succeeded.
    const isServerFn =
      request?.headers?.get?.("x-tsr-serverFn") === "true" ||
      (typeof request?.url === "string" && request.url.includes("/_serverFn"));
    if (isServerFn) throw error;
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
