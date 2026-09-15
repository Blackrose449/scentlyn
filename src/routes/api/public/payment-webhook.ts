import { createFileRoute } from "@tanstack/react-router";

/**
 * Card gateway webhook (Flutterwave).
 * Set this URL and the secret hash in the Flutterwave dashboard; the hash is
 * stored as the FLUTTERWAVE_WEBHOOK_HASH secret.
 */

type FlutterwaveWebhook = {
  event?: string;
  data?: {
    status?: string;
    tx_ref?: string;
    flw_ref?: string;
    amount?: number;
    currency?: string;
  };
};

export const Route = createFileRoute("/api/public/payment-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature =
          request.headers.get("verif-hash") ?? request.headers.get("x-flutterwave-signature");

        const { verifyFlutterwaveSignature } = await import("@/lib/payments.server");
        if (!verifyFlutterwaveSignature(signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const body = (await request.json().catch(() => null)) as FlutterwaveWebhook | null;
        const reference = body?.data?.tx_ref;
        if (!reference) return new Response("Invalid payload", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, total, payment_status")
          .eq("order_number", reference)
          .maybeSingle();

        if (!order) {
          console.error("Card webhook for unknown order", reference);
          return new Response("ok");
        }

        const successful =
          body?.data?.status === "successful" &&
          Number(body?.data?.amount ?? 0) >= Number(order.total);

        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: successful ? "paid" : "failed",
            status: successful ? "paid" : "pending",
            payment_provider: "flutterwave",
            payment_reference: body?.data?.flw_ref ?? reference,
            payment_meta: {
              event: body?.event ?? null,
              gateway_status: body?.data?.status ?? null,
              amount: body?.data?.amount ?? null,
              currency: body?.data?.currency ?? null,
            },
          })
          .eq("id", order.id);

        return new Response("ok");
      },
    },
  },
});
