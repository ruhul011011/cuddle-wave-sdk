import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Ensures the current user has at least the default 'user' role.
// Uses the authenticated user's client (RLS-scoped) so no service role key
// is required — matches the self-hosted deployment where SUPABASE_SERVICE_ROLE_KEY
// is not available. Requires an INSERT policy on public.user_roles allowing
// authenticated users to insert their own (user_id = auth.uid(), role = 'user') row.
export const ensureUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: existing, error: selErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (selErr) throw new Error(selErr.message);

    if (existing && existing.length > 0) {
      return { role: existing.some((r) => r.role === "admin") ? "admin" : "user" };
    }

    const { error: insErr } = await context.supabase
      .from("user_roles")
      .upsert(
        { user_id: context.userId, role: "user" },
        { onConflict: "user_id,role" },
      );

    // Ignore RLS/duplicate errors — role assignment is best-effort.
    if (insErr) console.warn("[ensureUserRole] upsert failed:", insErr.message);

    return { role: "user" as const };
  });
