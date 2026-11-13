import assert from "node:assert/strict";
import { test } from "node:test";
import { findCatalogueProduct } from "./catalogue-cache";
import type { StoreProduct } from "./storefront.functions";

const product = { id: "product-1", base_price: 1200 } as StoreProduct;
test("fresh catalogue product details are reusable without another blocking read", () => {
  assert.deepEqual(findCatalogueProduct([{ products: [product], updatedAt: 1000 }], "product-1", 2000), { product, updatedAt: 1000 });
});
test("old catalogue details are not reused for a newly opened product", () => {
  assert.equal(findCatalogueProduct([{ products: [product], updatedAt: 1000 }], "product-1", 61000), undefined);
});
test("a product absent from the catalogue still needs its own read", () => {
  assert.equal(findCatalogueProduct([{ products: [product], updatedAt: 1000 }], "other", 2000), undefined);
});