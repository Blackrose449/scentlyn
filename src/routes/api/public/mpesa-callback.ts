import { createFileRoute } from "@tanstack/react-router";

/**
 * Safaricom Daraja STK push callback.
 * Configure this URL as MPESA_CALLBACK_URL in the Daraja portal.
 */

type StkCallback = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: { Item?: { Name: string; Value?: string | number }[] };
    };
  };
};

export const Route = createFileRoute("/api/public/mpesa-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as StkCallback | null;
        const cb = body?.Body?.stkCallback;

        if (!cb?.CheckoutRequestID) {
          return Response.json({ ResultCode: 1, ResultDesc: "Invalid payload" }, { status: 400 });
        }

        // TODO: when Daraja IP allow-listing / shared secret is configured, verify
        // the caller here before touching the database.

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, payment_status")
          .eq("mpesa_checkout_request_id", cb.CheckoutRequestID)
          .maybeSingle();

        if (!order) {
          console.error("M-Pesa callback for unknown order", cb.CheckoutRequestID);
          return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
        }

        const items = cb.CallbackMetadata?.Item ?? [];
        const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
        const paid = cb.ResultCode === 0;

        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: paid ? "paid" : "failed",
            status: paid ? "paid" : "pending",
            mpesa_receipt_number: receipt ? String(receipt) : null,
            payment_provider: "mpesa",
            payment_meta: {
              result_code: cb.ResultCode ?? null,
              result_desc: cb.ResultDesc ?? null,
              merchant_request_id: cb.MerchantRequestID ?? null,
            },
          })
          .eq("id", order.id);

        return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
      },
    },
  },
});
