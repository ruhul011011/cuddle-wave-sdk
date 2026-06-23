import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_SECRET_KEY;
        const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret || !whSecret) return new Response("Stripe not configured", { status: 500 });

        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Missing signature", { status: 400 });

        const body = await request.text();
        const stripe = new Stripe(secret);

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
        } catch (err) {
          return new Response(`Invalid signature: ${(err as Error).message}`, { status: 400 });
        }

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          const fixtureIdRaw = session.metadata?.fixture_id;
          const userId = session.metadata?.user_id;
          const fixtureId = fixtureIdRaw ? Number(fixtureIdRaw) : NaN;
          if (userId && Number.isFinite(fixtureId) && session.payment_status === "paid") {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("match_purchases").upsert(
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
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
