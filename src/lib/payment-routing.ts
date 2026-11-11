export type PaymentMethod = "mpesa" | "card" | "cod";

/** All new online payments use the same hosted Pesapal checkout. */
export function paymentProvider(method: PaymentMethod) {
  return method === "cod" ? null : "pesapal";
}

export function checkoutMpesaMode(method: PaymentMethod) {
  return method === "mpesa" ? "pesapal" : "";
}

export function pesapalBillingName(fullName: string) {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const clean = (value: string) => value.replace(/[^\p{L}\p{N}_.:-]/gu, "");
  return { first_name: clean(first ?? "") || "Customer", middle_name: clean(rest.length > 1 ? rest.slice(0, -1).join("-") : first ?? "") || "Customer", last_name: clean(rest.at(-1) ?? "") || "Customer" };
}