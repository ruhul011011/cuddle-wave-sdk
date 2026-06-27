import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminSubscription = {
  user_id: string;
  email: string | null;
  plan: string;
  status: string;
  current_period_end: string | null;
  updated_at: string;
};

export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminSubscription[]> => {
    const { data, error } = await context.supabase.rpc("admin_list_subscriptions");
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminSubscription[];
  });

export const grantPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      user_id: z.string().uuid(),
      months: z.number().int().min(1).max(120),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_grant_premium", {
      _user_id: data.user_id,
      _months: data.months,
      _plan: "premium",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokePremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_revoke_premium", {
      _user_id: data.user_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
