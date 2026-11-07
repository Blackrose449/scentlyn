import assert from "node:assert/strict";
import { test } from "node:test";
import { productCardPrice } from "./storefront";

test("product cards show the main product price instead of a variant price", () => {
  assert.equal(
    productCardPrice({ base_price: 1000, variants: [{ price_override: 500 }] }),
    1000,
  );
});