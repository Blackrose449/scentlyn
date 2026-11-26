import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesProductSearch, scoreProductSearch } from "./product-search";

const product = { name: "Elbow Grease Spray", brand: "Elbow Grease", description: "Powerful degreaser for cleaning", category: { name: "Kitchen", slug: "kitchen" }, category_slugs: ["kitchen", "toiletries"], variants: [{ variant_value: "750ml" }] };
test("search matches product names case-insensitively", () => assert.equal(matchesProductSearch(product, "ELBOW spray"), true));
test("search matches categories including extra category names", () => assert.equal(matchesProductSearch(product, "BATHROOM", [{ name: "Bathroom", slug: "toiletries" }]), true));
test("search matches description keywords and variant labels", () => assert.equal(matchesProductSearch(product, "degreaser 750ML"), true));
test("unmatched search returns no match", () => assert.equal(matchesProductSearch(product, "unavailablexyz"), false));
test("clearing search restores every product", () => assert.equal(matchesProductSearch(product, "  "), true));
const softener = { name: "Lenor Fabric Softener", size_label: "1 litre", category: { name: "Laundry", slug: "laundry" }, variants: [{ id: "a", variant_type: "Scent", variant_value: "Lavender 500ml" }, { id: "b", variant_type: "Scent", variant_value: "Spring 2L" }, { id: "c", variant_type: "Pack", variant_value: "30 washes" }] };
test("units normalise: 1l, 1 L and 1 litre are the same", () => { for (const q of ["1l", "1 L", "1 litre"]) assert.ok(scoreProductSearch(softener, `softener ${q}`)); });
test("word order does not matter and picks the matching variant", () => assert.equal(scoreProductSearch(softener, "lavender softener 500 ml")?.variantId, "a"));
test("wash and load counts match the same variant", () => assert.equal(scoreProductSearch(softener, "30 loads")?.variantId, "c"));
test("one typo is tolerated in longer words", () => assert.ok(scoreProductSearch(softener, "sofener")));
test("sizes must match exactly", () => assert.equal(scoreProductSearch(softener, "softener 5l"), null));
test("product name ranks above category-only match", () => assert.ok(scoreProductSearch(softener, "softener")!.score > scoreProductSearch(softener, "laundry")!.score));
test("a bare number matches the size it starts, not a different size", () => { const dylon = { name: "Dylon Colour Catcher 52 Sheets" }; assert.ok(scoreProductSearch(dylon, "colour catcher 52")); assert.equal(scoreProductSearch(dylon, "5"), null); });
