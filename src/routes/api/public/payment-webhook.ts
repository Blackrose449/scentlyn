import { createFileRoute } from "@tanstack/react-router";

/**
 * Pesapal IPN handler (API v3).
 *
 * Register this URL in the Pesapal dashboard (or via RegisterIPN) and store the
 * returned ipn_id as the PESAPAL_IPN_ID secret. Pesapal may call it with GET
 * query params or a JSON POST body, and the payload is NOT signed, so the real
 * outcome is always re-fetched with GetTransactionStatus before any DB write.
 */

type IpnPayload = {
  OrderTrackingId?: string;
  OrderMerchantReference?: string;
  OrderNotificationType?: string;
};

async function handleIpn(request: Request) {
  const url = new URL(request.url);
  let payload: IpnPayload = {
    OrderTrackingId: url.searchParams.get("OrderTrackingId") ?? undefined,
    OrderMerchantReference: url.searchParams.get("OrderMerchantReference") ?? undefined,
    OrderNotificationType: url.searchParams.get("OrderNotificationType") ?? undefined,
  };

  if (request.method === "POST") {
    const body = (await request.json().catch(() => null)) as IpnPayload | null;
    if (body) payload = { ...payload, ...body };
  }

  const trackingId = payload.OrderTrackingId;
  const reference = payload.OrderMerchantReference;
  if (!trackingId) return new Response("Invalid payload", { status: 400 });

  const { getPesapalTransactionStatus } = await import("@/lib/payments.server");
  const status = await getPesapalTransactionStatus(trackingId);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const lookupRef = status.merchantReference ?? reference;
  const query = supabaseAdmin.from("orders").select("id, total, payment_status");
  const { data: order } = lookupRef
    ? await query.eq("order_number", lookupRef).maybeSingle()
    : await query.eq("payment_reference", trackingId).maybeSingle();

  if (!order) {
    console.error("Pesapal IPN for unknown order", lookupRef ?? trackingId);
    return Response.json({
      orderNotificationType: payload.OrderNotificationType ?? "IPNCHANGE",
      orderTrackingId: trackingId,
      orderMerchantReference: reference ?? "",
      status: 200,
    });
  }

  if (!status.ok) {
    console.error("Pesapal IPN could not be verified", trackingId);
    return Response.json({
      orderNotificationType: payload.OrderNotificationType ?? "IPNCHANGE",
      orderTrackingId: trackingId,
      orderMerchantReference: reference ?? "",
      status: 500,
    });
  }

  const successful = status.paid && Number(status.amount ?? 0) >= Number(order.total);

  await supabaseAdmin
    .from("orders")
    .update({
      payment_status: successful ? "paid" : "failed",
      status: successful ? "paid" : "pending",
      payment_provider: "pesapal",
      payment_reference: trackingId,
      payment_meta: {
        notification_type: payload.OrderNotificationType ?? null,
        gateway_status: status.statusText,
        confirmation_code: status.confirmationCode,
        payment_method: status.paymentMethod,
        amount: status.amount,
        currency: status.currency,
      },
    })
    .eq("id", order.id);

  return Response.json({
    orderNotificationType: payload.OrderNotificationType ?? "IPNCHANGE",
    orderTrackingId: trackingId,
    orderMerchantReference: status.merchantReference ?? reference ?? "",
    status: 200,
  });
}

export const Route = createFileRoute("/api/public/payment-webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => handleIpn(request),
      POST: async ({ request }) => handleIpn(request),
    },
  },
});
