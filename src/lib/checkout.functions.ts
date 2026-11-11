import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkoutMpesaMode } from "./payment-routing";

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
  mpesaMode: z.enum(["stk", "till"]).optional(),
  checkoutKey: z.string().uuid(),
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

    const { data: result, error } = await supabaseAdmin.rpc("create_checkout_order", {
      p_full_name: data.customer.fullName,
      p_phone: phone,
      p_email: data.customer.email ?? "",
      p_delivery_zone_id: data.deliveryZoneId,
      p_delivery_address_note: data.deliveryAddressNote ?? "",
      p_payment_method: data.paymentMethod,
      p_mpesa_mode: checkoutMpesaMode(data.paymentMethod),
      p_checkout_key: data.checkoutKey,
      p_items: data.items.map((item) => ({
        product_id: item.productId,
        variant_id: item.variantId ?? null,
        quantity: item.quantity,
      })),
    });
    if (error) {
      console.error("Checkout order transaction failed", error.code, error.message, error.details, error.hint);
      throw new Error("We couldn't save your order. Your cart is still here—please try again.");
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new Error("We couldn't confirm your order. Your cart is still here—please try again.");
    }
    const order = result as Record<string, unknown>;
    if (order["ok"] !== true) {
      return { ok: false as const, error: typeof order["error"] === "string" ? order["error"] : "Please check your details and try again." };
    }
    if (typeof order["order_id"] !== "string" || typeof order["order_number"] !== "string") {
      throw new Error("We couldn't confirm your order. Your cart is still here—please try again.");
    }
    return {
      ok: true as const,
      orderId: order["order_id"],
      orderNumber: order["order_number"],
      subtotal: Number(order["subtotal"]),
      deliveryFee: Number(order["delivery_fee"]),
      total: Number(order["total"]),
      phone,
      tillNumber: typeof order["till_number"] === "string" ? order["till_number"] : null,
    };
  });

export const startMpesaPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { startPesapalCheckout } = await import("./pesapal-checkout.server");
    return startPesapalCheckout(data.orderId);
  });

export const startCardPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { startPesapalCheckout } = await import("./pesapal-checkout.server");
    return startPesapalCheckout(data.orderId);
  });

export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status, payment_status, payment_method, payment_provider, mpesa_receipt_number, subtotal, delivery_fee, total, created_at")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw error;
    return order ?? null;
  });

type TillDb = { from: (table: "site_settings") => { select: (cols: string) => { in: (col: string, vals: string[]) => PromiseLike<{ data: { key: string; value: unknown }[] | null; error: unknown }> } } };
async function readTillSettings(db: unknown) {
  const { data, error } = await (db as TillDb).from("site_settings").select("key,value").in("key", ["mpesa_till_enabled", "mpesa_till_number", "mpesa_till_name"]);
  if (error) throw error;
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  const number = typeof map["mpesa_till_number"] === "string" ? map["mpesa_till_number"].replace(/\D/g, "") : "";
  if (map["mpesa_till_enabled"] !== true || number.length < 5) return null;
  return { number, name: typeof map["mpesa_till_name"] === "string" ? map["mpesa_till_name"].trim() : "" };
}

/** Public: lets checkout and the order page show the Till option (null when switched off). */
export const getPaymentOptions = createServerFn({ method: "GET" }).handler(async () => {
  // Never let a settings problem take checkout down: if anything fails, just hide the Till option.
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return { till: await readTillSettings(supabaseAdmin) };
  } catch {
    return { till: null };
  }
});

/** Customer enters the M-Pesa confirmation code after paying to the Till. Admin still confirms and marks the order paid. */
export const submitTillReceipt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ orderId: z.string().uuid(), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{10}$/, "Enter the 10-character M-Pesa code from your SMS") }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin.from("orders").select("id, payment_provider, payment_status").eq("id", data.orderId).maybeSingle();
    if (error) throw error;
    if (!order || order.payment_provider !== "mpesa_till") return { ok: false as const, error: "Order not found." };
    if (order.payment_status === "paid") return { ok: true as const };
    const { error: updateError } = await supabaseAdmin.from("orders").update({ mpesa_receipt_number: data.code }).eq("id", order.id);
    if (updateError) throw updateError;
    return { ok: true as const };
  });
