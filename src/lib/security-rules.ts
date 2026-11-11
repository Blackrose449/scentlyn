export function ownsGuestOrder(expected: unknown, supplied: unknown): boolean {
  if (typeof expected !== "string" || typeof supplied !== "string" || expected.length !== 36 || supplied.length !== 36) return false;
  let difference = 0;
  for (let i = 0; i < 36; i++) difference |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return difference === 0;
}

export function verifiedPaymentMatches(order: { total: number; reference: string | null; trackingId: string | null }, payment: { ok: boolean; paid: boolean; amount: number | null; currency: string | null; merchantReference: string | null }, trackingId: string): boolean {
  return payment.ok && payment.paid && payment.currency === "KES" &&
    payment.amount !== null && Number.isFinite(payment.amount) && payment.amount === Number(order.total) &&
    order.reference !== null && payment.merchantReference === order.reference && order.trackingId === trackingId;
}