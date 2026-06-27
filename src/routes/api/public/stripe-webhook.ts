import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getServerEnv } = await import("@/lib/env.server");
        const secret = getServerEnv("STRIPE_SECRET_KEY");
        const whSecret = getServerEnv("STRIPE_WEBHOOK_SECRET");

        const logEntry = async (entry: {
          status: string;
          message?: string | null;
          event_id?: string | null;
          event_type?: string | null;
          fixture_id?: number | null;
          user_id?: string | null;
          stripe_session_id?: string | null;
          amount_cents?: number | null;
          currency?: string | null;
          payload?: unknown;
        }) => {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("stripe_webhook_logs").insert({
              status: entry.status,
              message: entry.message ?? null,
              event_id: entry.event_id ?? null,
              event_type: entry.event_type ?? null,
              fixture_id: entry.fixture_id ?? null,
              user_id: entry.user_id ?? null,
              stripe_session_id: entry.stripe_session_id ?? null,
              amount_cents: entry.amount_cents ?? null,
              currency: entry.currency ?? null,
              payload: (entry.payload ?? null) as never,
            });
          } catch (e) {
            console.error("[stripe-webhook] failed to log", e);
          }
        };

        if (!secret || !whSecret) {
          await logEntry({ status: "error", message: "Stripe not configured" });
          return new Response("Stripe not configured", { status: 500 });
        }

        const sig = request.headers.get("stripe-signature");
        if (!sig) {
          await logEntry({ status: "error", message: "Missing stripe-signature header" });
          return new Response("Missing signature", { status: 400 });
        }

        const body = await request.text();
        const stripe = new Stripe(secret);

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
        } catch (err) {
          const msg = (err as Error).message;
          await logEntry({ status: "invalid_signature", message: msg });
          return new Response(`Invalid signature: ${msg}`, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: alreadyProcessed } = await supabaseAdmin
          .from("stripe_webhook_logs")
          .select("id")
          .eq("event_id", event.id)
          .eq("status", "processed")
          .maybeSingle();
        if (alreadyProcessed) return new Response("ok", { status: 200 });

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          const fixtureIdRaw = session.metadata?.fixture_id;
          const planId = session.metadata?.plan_id;
          const planMonths = Number(session.metadata?.plan_months ?? 0);
          const userId = session.metadata?.user_id;
          const fixtureId = fixtureIdRaw ? Number(fixtureIdRaw) : NaN;

          if (userId && planId && Number.isFinite(planMonths) && planMonths > 0 && session.payment_status === "paid") {
            const { data: existing } = await supabaseAdmin
              .from("subscriptions")
              .select("current_period_end")
              .eq("user_id", userId)
              .maybeSingle();
            const baseDate = existing?.current_period_end && new Date(existing.current_period_end) > new Date()
              ? new Date(existing.current_period_end)
              : new Date();
            baseDate.setMonth(baseDate.getMonth() + planMonths);

            const { error } = await supabaseAdmin.from("subscriptions").upsert(
              {
                user_id: userId,
                plan: "premium",
                status: "active",
                current_period_end: baseDate.toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            );
            if (error) {
              await logEntry({
                status: "db_error",
                message: error.message,
                event_id: event.id,
                event_type: event.type,
                user_id: userId,
                stripe_session_id: session.id,
                amount_cents: session.amount_total ?? null,
                currency: session.currency ?? null,
                payload: event,
              });
            } else {
              await logEntry({
                status: "processed",
                message: `Premium plan recorded: ${planId}`,
                event_id: event.id,
                event_type: event.type,
                user_id: userId,
                stripe_session_id: session.id,
                amount_cents: session.amount_total ?? null,
                currency: session.currency ?? null,
                payload: event,
              });
            }
          } else if (userId && Number.isFinite(fixtureId) && session.payment_status === "paid") {
            const { error } = await supabaseAdmin.from("match_purchases").upsert(
              {
                user_id: userId,
                fixture_id: fixtureId,
                stripe_session_id: session.id,
                amount_cents: session.amount_total ?? 0,
                currency: (session.currency ?? "usd").toLowerCase(),
                status: "paid",
              },
              { onConflict: "user_id,fixture_id" },
            );
            if (error) {
              await logEntry({
                status: "db_error",
                message: error.message,
                event_id: event.id,
                event_type: event.type,
                fixture_id: fixtureId,
                user_id: userId,
                stripe_session_id: session.id,
                amount_cents: session.amount_total ?? null,
                currency: session.currency ?? null,
                payload: event,
              });
            } else {
              await logEntry({
                status: "processed",
                message: "Purchase recorded",
                event_id: event.id,
                event_type: event.type,
                fixture_id: fixtureId,
                user_id: userId,
                stripe_session_id: session.id,
                amount_cents: session.amount_total ?? null,
                currency: session.currency ?? null,
                payload: event,
              });
            }
          } else {
            await logEntry({
              status: "skipped",
              message: "Missing metadata or not paid",
              event_id: event.id,
              event_type: event.type,
              fixture_id: Number.isFinite(fixtureId) ? fixtureId : null,
              user_id: userId ?? null,
              stripe_session_id: session.id,
              amount_cents: session.amount_total ?? null,
              currency: session.currency ?? null,
              payload: event,
            });
          }
        } else {
          await logEntry({
            status: "ignored",
            message: "Event type not handled",
            event_id: event.id,
            event_type: event.type,
            payload: event,
          });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
