import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifiedPaymentMatches } from "@/lib/security-rules";

/**
 * Pesapal IPN handler (API v3).
 *
 * Register this URL in the Pesapal dashboard (or via RegisterIPN) and store the
 * returned ipn_id as the PESAPAL_IPN_ID secret. Pesapal may call it with GET
 * query params or a JSON POST body, and the payload is NOT signed, so the real
 * outcome is always re-fetched with GetTransactionStatus before any DB write.
 */

type IpnPayload = {
  OrderTrackingId?: string | undefined;
  OrderMerchantReference?: string | undefined;
  OrderNotificationType?: string | undefined;
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

  const parsed = z.object({ OrderTrackingId: z.string().uuid(), OrderMerchantReference: z.string().max(100).optional(), OrderNotificationType: z.string().max(40).optional() }).safeParse(payload);
  if (!parsed.success) return new Response("Invalid payload", { status: 400 });
  const trackingId = parsed.data.OrderTrackingId;
  const reference = parsed.data.OrderMerchantReference;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order, error: lookupError } = await supabaseAdmin.from("orders")
    .select("id, total, status, payment_status, payment_meta, payment_reference")
    .eq("payment_provider", "pesapal").eq("payment_reference", trackingId).maybeSingle();
  if (lookupError) return new Response("Please retry", { status: 503 });

  if (!order) {
    return Response.json({
      orderNotificationType: payload.OrderNotificationType ?? "IPNCHANGE",
      orderTrackingId: trackingId,
      orderMerchantReference: reference ?? "",
      status: 200,
    });
  }

  const { getPesapalTransactionStatus } = await import("@/lib/payments.server");
  const status = await getPesapalTransactionStatus(trackingId);

  if (!status.ok) {
    console.error("Pesapal IPN could not be verified", trackingId);
    return Response.json({
      orderNotificationType: payload.OrderNotificationType ?? "IPNCHANGE",
      orderTrackingId: trackingId,
      orderMerchantReference: reference ?? "",
      status: 500,
    });
  }

  const meta = order.payment_meta && typeof order.payment_meta === "object" && !Array.isArray(order.payment_meta) ? order.payment_meta : {};
  const storedReference = typeof meta["pesapal_merchant_reference"] === "string" ? meta["pesapal_merchant_reference"] : null;
  const successful = verifiedPaymentMatches({ total: Number(order.total), reference: storedReference, trackingId: order.payment_reference }, status, trackingId);
  // Ignore unverified/mismatched, pending, stale, and replayed notifications. Never downgrade fulfilment.
  if (!successful || order.payment_status === "paid" || ["packing", "delivered", "cancelled"].includes(order.status)) {
    return Response.json({ orderNotificationType: parsed.data.OrderNotificationType ?? "IPNCHANGE", orderTrackingId: trackingId, orderMerchantReference: reference ?? "", status: 200 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      payment_status: successful ? "paid" : "failed",
      status: successful ? "paid" : "pending",
      payment_provider: "pesapal",
      payment_reference: trackingId,
      payment_meta: {
        ...meta,
        notification_type: payload.OrderNotificationType ?? null,
        gateway_status: status.statusText,
        confirmation_code: status.confirmationCode,
        payment_method: status.paymentMethod,
        amount: status.amount,
        currency: status.currency,
      },
    })
    .eq("id", order.id).eq("payment_reference", trackingId).neq("payment_status", "paid").in("status", ["pending", "paid"]);
  if (updateError) {
    console.error("Could not save verified Pesapal payment", updateError.message);
    return Response.json({
      orderNotificationType: payload.OrderNotificationType ?? "IPNCHANGE",
      orderTrackingId: trackingId,
      orderMerchantReference: status.merchantReference ?? reference ?? "",
      status: 500,
    });
  }

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
