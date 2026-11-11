import { describe, expect, it } from "bun:test";
import { ownsGuestOrder, verifiedPaymentMatches } from "./security-rules";

describe("guest order authorization", () => {
  const key = "11111111-1111-4111-8111-111111111111";
  it("allows the checkout browser proof", () => expect(ownsGuestOrder(key, key)).toBe(true));
  it("denies missing proof", () => expect(ownsGuestOrder(key, undefined)).toBe(false));
  it("denies another browser proof", () => expect(ownsGuestOrder(key, "22222222-2222-4222-8222-222222222222")).toBe(false));
  it("never grants legacy orders without proof", () => expect(ownsGuestOrder(null, null)).toBe(false));
});
describe("verified Pesapal payments", () => {
  const order = { total: 1350, reference: "SCN-test-attempt", trackingId: "tracking" };
  const paid = { ok: true, paid: true, amount: 1350, currency: "KES", merchantReference: "SCN-test-attempt" };
  it("accepts the matching verified transaction", () => expect(verifiedPaymentMatches(order, paid, "tracking")).toBe(true));
  it("rejects a different merchant reference", () => expect(verifiedPaymentMatches(order, { ...paid, merchantReference: "another-order" }, "tracking")).toBe(false));
  it("rejects reused transaction IDs", () => expect(verifiedPaymentMatches(order, paid, "another-tracking")).toBe(false));
  it("rejects insufficient or mismatched amounts", () => expect(verifiedPaymentMatches(order, { ...paid, amount: 1300 }, "tracking")).toBe(false));
  it("rejects other currencies", () => expect(verifiedPaymentMatches(order, { ...paid, currency: "USD" }, "tracking")).toBe(false));
  it("rejects unverified success", () => expect(verifiedPaymentMatches(order, { ...paid, ok: false }, "tracking")).toBe(false));
});