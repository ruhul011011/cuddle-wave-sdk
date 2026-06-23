import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Ensures the current user has at least the default 'user' role.
// Does NOT grant 'admin' — only the absence of an admin row matters for gating,
// but we explicitly assign 'user' so every signed-in account is classified.
export const ensureUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (existing && existing.length > 0) {
      return { role: existing.some((r) => r.role === "admin") ? "admin" : "user" };
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: context.userId, role: "user" },
        { onConflict: "user_id,role" },
      );

    return { role: "user" as const };
  });
