export type PaymentMethod = "mpesa" | "card" | "cod";

/** All new online payments use the same hosted Pesapal checkout. */
export function paymentProvider(method: PaymentMethod) {
  return method === "cod" ? null : "pesapal";
}

export function checkoutMpesaMode(method: PaymentMethod) {
  return method === "mpesa" ? "pesapal" : "";
}