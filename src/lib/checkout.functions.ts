import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public checkout + payment initiation server functions.
 *
 * Prices, stock and delivery fees are ALWAYS re-read from the database here;
 * anything the browser sends about money is ignored.
 */

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(50),
});

const checkoutSchema = z.object({
  customer: z.object({
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(9).max(20),
    email: z.string().trim().email().max(160).nullable().optional(),
  }),
  deliveryZoneId: z.string().uuid(),
  deliveryAddressNote: z.string().trim().max(500).nullable().optional(),
  paymentMethod: z.enum(["mpesa", "card", "cod"]),
  items: z.array(cartItemSchema).min(1).max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data }) => {
    const { normalizeKenyanPhone } = await import("./payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const phone = normalizeKenyanPhone(data.customer.phone);
    if (!phone) {
      return { ok: false as const, error: "Enter a valid Kenyan phone number." };
    }

    const { data: zone, error: zoneError } = await supabaseAdmin
      .from("delivery_zones")
      .select("id, delivery_fee, is_active")
      .eq("id", data.deliveryZoneId)
      .maybeSingle();
    if (zoneError) throw zoneError;
    if (!zone || !zone.is_active) {
      return { ok: false as const, error: "Choose an available delivery area." };
    }

    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, base_price, status")
      .in("id", productIds);
    if (productError) throw productError;

    const variantIds = data.items
      .map((i) => i.variantId)
      .filter((v): v is string => typeof v === "string" && v.length > 0);
    const { data: variants, error: variantError } = variantIds.length
      ? await supabaseAdmin
          .from("product_variants")
          .select("id, product_id, variant_value, price_override, stock_quantity")
          .in("id", variantIds)
      : { data: [], error: null };
    if (variantError) throw variantError;

    const lines: {
      product_id: string;
      variant_id: string | null;
      product_name: string;
      variant_label: string | null;
      quantity: number;
      unit_price: number;
      line_total: number;
    }[] = [];

    for (const item of data.items) {
      const product = products?.find((p) => p.id === item.productId);
      if (!product || product.status !== "active") {
        return { ok: false as const, error: "One of the items is no longer available." };
      }

      let unitPrice = Number(product.base_price);
      let variantLabel: string | null = null;

      if (item.variantId) {
        const variant = variants?.find((v) => v.id === item.variantId);
        if (!variant || variant.product_id !== product.id) {
          return { ok: false as const, error: "One of the selected options is unavailable." };
        }
        if (variant.stock_quantity < item.quantity) {
          return {
            ok: false as const,
            error: `${product.name} (${variant.variant_value}) only has ${variant.stock_quantity} left.`,
          };
        }
        if (variant.price_override !== null) unitPrice = Number(variant.price_override);
        variantLabel = variant.variant_value;
      }

      const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
      lines.push({
        product_id: product.id,
        variant_id: item.variantId ?? null,
        product_name: product.name,
        variant_label: variantLabel,
        quantity: item.quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
      });
    }

    const subtotal = Math.round(lines.reduce((sum, l) => sum + l.line_total, 0) * 100) / 100;
    const deliveryFee = Number(zone.delivery_fee);
    const total = Math.round((subtotal + deliveryFee) * 100) / 100;

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .insert({
        full_name: data.customer.fullName,
        phone,
        email: data.customer.email ?? null,
      })
      .select("id")
      .single();
    if (customerError) throw customerError;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_id: customer.id,
        status: "pending",
        payment_method: data.paymentMethod,
        payment_status: data.paymentMethod === "cod" ? "pending" : "pending",
        delivery_zone_id: zone.id,
        delivery_address_note: data.deliveryAddressNote ?? null,
        subtotal,
        delivery_fee: deliveryFee,
        total,
      })
      .select("id, order_number, total")
      .single();
    if (orderError) throw orderError;

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (itemsError) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw itemsError;
    }

    // Decrement stock for variant-tracked lines.
    for (const line of lines) {
      if (!line.variant_id) continue;
      const variant = variants?.find((v) => v.id === line.variant_id);
      if (!variant) continue;
      await supabaseAdmin
        .from("product_variants")
        .update({ stock_quantity: variant.stock_quantity - line.quantity })
        .eq("id", line.variant_id);
    }

    return {
      ok: true as const,
      orderId: order.id,
      orderNumber: order.order_number,
      subtotal,
      deliveryFee,
      total,
      phone,
    };
  });

export const startMpesaPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { startStkPush, normalizeKenyanPhone } = await import("./payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total, payment_status, customers(phone)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return { ok: false as const, error: "Order not found." };
    if (order.payment_status === "paid") {
      return { ok: false as const, error: "This order is already paid." };
    }

    const rawPhone = (order.customers as { phone: string } | null)?.phone ?? "";
    const phone = normalizeKenyanPhone(rawPhone);
    if (!phone) return { ok: false as const, error: "Order has no valid phone number." };

    const result = await startStkPush({
      phone,
      amount: Number(order.total),
      accountReference: order.order_number,
      description: `Scentlyn ${order.order_number}`,
    });

    if (!result.ok) return { ok: false as const, error: result.customerMessage };

    await supabaseAdmin
      .from("orders")
      .update({
        payment_provider: "mpesa",
        mpesa_checkout_request_id: result.checkoutRequestId,
        mpesa_merchant_request_id: result.merchantRequestId,
        payment_meta: { stk_simulated: result.simulated },
      })
      .eq("id", order.id);

    return {
      ok: true as const,
      message: result.customerMessage,
      simulated: result.simulated,
      checkoutRequestId: result.checkoutRequestId,
    };
  });

export const startCardPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { startCardCharge } = await import("./payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total, payment_status, customers(full_name, phone, email)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return { ok: false as const, error: "Order not found." };
    if (order.payment_status === "paid") {
      return { ok: false as const, error: "This order is already paid." };
    }

    const customer = order.customers as
      | { full_name: string; phone: string; email: string | null }
      | null;
    const siteUrl = process.env["PUBLIC_SITE_URL"] ?? "";

    const result = await startCardCharge({
      reference: order.order_number,
      amount: Number(order.total),
      customerEmail: customer?.email ?? "orders@scentlyn.co.ke",
      customerName: customer?.full_name ?? "Scentlyn customer",
      customerPhone: customer?.phone ?? "",
      redirectUrl: `${siteUrl}/order/${order.id}`,
    });

    if (!result.ok) {
      return { ok: false as const, error: "Card payment could not be started." };
    }

    await supabaseAdmin
      .from("orders")
      .update({
        payment_provider: result.provider,
        payment_reference: result.trackingId ?? result.reference,
        payment_meta: {
          card_simulated: result.simulated,
          pesapal_tracking_id: result.trackingId,
          merchant_reference: result.reference,
        },
      })
      .eq("id", order.id);

    return {
      ok: true as const,
      checkoutUrl: result.checkoutUrl,
      simulated: result.simulated,
      reference: result.reference,
    };
  });

export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status, payment_status, payment_method, subtotal, delivery_fee, total, created_at")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw error;
    return order ?? null;
  });
