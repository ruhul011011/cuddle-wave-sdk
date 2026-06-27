import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

// List all users with the admin role (via SECURITY DEFINER RPC, no service-role key required).
export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    const { data, error } = await context.supabase.rpc("admin_list_admins");
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminUser[];
  });

// Grant the admin role to an existing user identified by their email.
// NOTE: the user must have signed in at least once (e.g. via Google) so they exist in auth.users.
// Creating brand-new email/password users is not supported here because that requires the
// Supabase service role key, which is not exposed to self-hosted Lovable Cloud deployments.
export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ email: z.string().email() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc(
      "admin_grant_admin_by_email",
      { _email: data.email },
    );
    if (error) throw new Error(error.message);
    return { id: id as string, email: data.email };
  });

// Revoke admin role (keeps the user account; cannot revoke your own role).
export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_revoke_admin", {
      _user_id: data.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
