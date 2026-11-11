import assert from "node:assert/strict";
import { test } from "node:test";
import { checkoutMpesaMode, paymentProvider, pesapalBillingName } from "./payment-routing";

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

test("Pesapal billing names support customers with multiple surnames", () => {
  assert.deepEqual(pesapalBillingName("Jane Mary Oduor"), { first_name: "Jane", middle_name: "Mary", last_name: "Oduor" });
});