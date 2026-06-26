import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

async function assertCallerIsAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

// List all users with the admin role.
export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    await assertCallerIsAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (rolesErr) throw new Error(rolesErr.message);

    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    const out: AdminUser[] = [];
    for (const id of ids) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      if (data?.user) {
        out.push({
          id: data.user.id,
          email: data.user.email ?? null,
          created_at: data.user.created_at,
          last_sign_in_at: data.user.last_sign_in_at ?? null,
        });
      }
    }
    out.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
    return out;
  });

// Create a new user (auto-confirmed) and grant them admin role.
export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(8).max(72),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // If the user already exists, just grant the role.
    let userId: string | null = null;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (createErr) {
      // Email already registered → look up the existing user id.
      if (/already/i.test(createErr.message) || /registered/i.test(createErr.message)) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = list?.users.find((u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase());
        if (!found) throw new Error(createErr.message);
        userId = found.id;
        // Update password to the supplied one.
        await supabaseAdmin.auth.admin.updateUserById(found.id, { password: data.password });
      } else {
        throw new Error(createErr.message);
      }
    } else {
      userId = created?.user?.id ?? null;
    }
    if (!userId) throw new Error("Could not resolve new user id");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);
    return { id: userId, email: data.email };
  });

// Reset an admin's password.
export const updateAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      password: z.string().min(8).max(72),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Revoke admin role (keeps the user account; cannot revoke your own role).
export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("You cannot revoke your own admin role.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
