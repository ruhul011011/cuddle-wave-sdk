import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StripeWebhookLog = {
  id: string;
  created_at: string;
  status: string;
  event_type: string | null;
  event_id: string | null;
  message: string | null;
  fixture_id: number | null;
  user_id: string | null;
  stripe_session_id: string | null;
  amount_cents: number | null;
  currency: string | null;
};

export const listStripeWebhookLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ limit: z.number().int().min(1).max(200).default(100) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<StripeWebhookLog[]> => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Forbidden");

    const { data: rows, error } = await context.supabase
      .from("stripe_webhook_logs")
      .select("id, created_at, status, event_type, event_id, message, fixture_id, user_id, stripe_session_id, amount_cents, currency")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []) as StripeWebhookLog[];
  });
