import assert from "node:assert/strict";
import { test } from "node:test";
import { checkoutAttemptKey } from "./checkout-key";
import { productCardPrice } from "./storefront";

test("product cards show the main product price instead of a variant price", () => {
  assert.equal(
    productCardPrice({ base_price: 1000, variants: [{ price_override: 500 }] }),
    1000,
  );
});

test("a repeated checkout attempt with the same details reuses its saved key", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  };
  let created = 0;
  const createId = () => `attempt-${++created}`;

  const first = checkoutAttemptKey(storage, "same basket", createId);
  const repeated = checkoutAttemptKey(storage, "same basket", createId);
  const changed = checkoutAttemptKey(storage, "updated basket", createId);

  assert.equal(repeated, first);
  assert.notEqual(changed, first);
  assert.equal(created, 2);
});