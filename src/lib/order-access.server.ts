import { getCookie, getRequest, setCookie, setResponseHeader } from "@tanstack/react-start/server";
import { ownsGuestOrder } from "./security-rules";

export function grantOrderAccess(orderId: string, checkoutKey: string) {
  setCookie(`scentlyn-order-${orderId}`, checkoutKey, {
    httpOnly: true, secure: new URL(getRequest().url).protocol === "https:",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  setResponseHeader("Cache-Control", "private, no-store");
}

export async function assertOrderAccess(orderId: string) {
  setResponseHeader("Cache-Control", "private, no-store");
  const proof = getCookie(`scentlyn-order-${orderId}`);
  if (!proof) throw new Error("Order access denied. Open this order in the browser used at checkout.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("orders").select("payment_meta").eq("id", orderId).maybeSingle();
  const meta = data?.payment_meta;
  const key = meta && typeof meta === "object" && !Array.isArray(meta) ? meta["checkout_key"] : null;
  if (error || !ownsGuestOrder(key, proof)) throw new Error("Order access denied. Open this order in the browser used at checkout.");
}