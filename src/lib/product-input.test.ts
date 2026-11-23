import assert from "node:assert/strict";
import { test } from "node:test";
import { optionalSizePayload, productInput } from "./product-input";

const input = { id: null, name: "Tesco Oxy Power Stain Remover Spray", brand: "Tesco", category_id: null, subcategory: "Stain Remover", description: null, base_price: 1500, stock_quantity: 3, is_featured: false, is_best_seller: false, status: "draft", variants: [], images: [] };
test("product saving accepts the screenshot's omitted size_label", () => {
  const parsed = productInput.parse(input);
  assert.equal(parsed.base_price, 1500);
  assert.deepEqual(optionalSizePayload(parsed), {});
});
test("product saving preserves an explicitly supplied size", () => {
  assert.deepEqual(optionalSizePayload(productInput.parse({ ...input, size_label: "750ml" })), { size_label: "750ml" });
});
test("an explicit empty size clears the saved label", () => {
  assert.deepEqual(optionalSizePayload(productInput.parse({ ...input, size_label: null })), { size_label: null });
});
test("product saving still rejects an invalid size type", () => {
  assert.equal(productInput.safeParse({ ...input, size_label: 750 }).success, false);
});