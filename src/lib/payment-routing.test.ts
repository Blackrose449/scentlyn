import assert from "node:assert/strict";
import { test } from "node:test";
import { checkoutMpesaMode, paymentProvider } from "./payment-routing";

test("M-Pesa uses Pesapal rather than direct Daraja or Till checkout", () => {
  assert.equal(paymentProvider("mpesa"), "pesapal");
  assert.equal(checkoutMpesaMode("mpesa"), "pesapal");
});

test("card continues to use Pesapal", () => {
  assert.equal(paymentProvider("card"), "pesapal");
});

test("cash on delivery does not use an online provider", () => {
  assert.equal(paymentProvider("cod"), null);
});