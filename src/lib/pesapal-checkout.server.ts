export async function startPesapalCheckout(orderId: string) {
    const { startCardCharge, cleanEnv } = await import("./payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total, payment_status, payment_method, payment_provider, customers(full_name, phone, email)")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return { ok: false as const, error: "Order not found." };
    if (order.payment_status === "paid") {
      return { ok: false as const, error: "This order is already paid." };
    }

    if (order.payment_method === "cod" || order.payment_provider === "mpesa_till") {
      return { ok: false as const, error: "This order does not use Pesapal checkout." };
    }

    const customer = order.customers as
      | { full_name: string; phone: string; email: string | null }
      | null;
    const siteUrl = (cleanEnv("PUBLIC_SITE_URL") || "https://scentlyn.lovable.app").replace(/\/+$/, "");
    const attemptReference = `${order.order_number}-${crypto.randomUUID().slice(0, 8)}`;
    const { error: referenceError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_provider: "pesapal",
        payment_meta: {
          card_simulated: false,
          pesapal_merchant_reference: attemptReference,
        },
      })
      .eq("id", order.id);
    if (referenceError) {
      console.error("Could not save Pesapal payment reference", referenceError.message);
      return { ok: false as const, error: "Your order is saved, but payment setup did not finish. Please retry from your order page." };
    }

    let result;
    try {
      result = await startCardCharge({
        reference: attemptReference,
        amount: Number(order.total),
        customerEmail: customer?.email ?? "scentlynlaundry@gmail.com",
        customerName: customer?.full_name ?? "Scentlyn customer",
        customerPhone: customer?.phone ?? "",
        redirectUrl: `${siteUrl}/order/${order.id}`,
      });
    } catch (cause) {
      console.error("Pesapal payment start failed", cause instanceof Error ? cause.message : "unknown error");
      return { ok: false as const, error: "Your order is saved, but Pesapal could not be reached. Retry payment from your order page." };
    }

    if (!result.ok) {
      return { ok: false as const, error: "Payment could not be started. Please retry from your saved order." };
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_provider: result.provider,
        payment_reference: result.trackingId ?? result.reference,
        payment_meta: {
          card_simulated: result.simulated,
          pesapal_tracking_id: result.trackingId,
          pesapal_merchant_reference: result.reference,
        },
      })
      .eq("id", order.id);
    if (updateError) {
      console.error("Could not save Pesapal request details", updateError.message);
      return { ok: false as const, error: "Your order is saved. We couldn't confirm the Pesapal request; retry from your order page." };
    }

    return {
      ok: true as const,
      checkoutUrl: result.checkoutUrl,
      simulated: result.simulated,
      reference: result.reference,
    };
}
