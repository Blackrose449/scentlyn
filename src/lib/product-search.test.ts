import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesProductSearch } from "./product-search";

const product = { name: "Elbow Grease Spray", brand: "Elbow Grease", description: "Powerful degreaser for cleaning", category: { name: "Kitchen", slug: "kitchen" }, category_slugs: ["kitchen", "toiletries"], variants: [{ variant_value: "750ml" }] };
test("search matches product names case-insensitively", () => assert.equal(matchesProductSearch(product, "ELBOW spray"), true));
test("search matches categories including extra category names", () => assert.equal(matchesProductSearch(product, "BATHROOM", [{ name: "Bathroom", slug: "toiletries" }]), true));
test("search matches description keywords and variant labels", () => assert.equal(matchesProductSearch(product, "degreaser 750ML"), true));
test("unmatched search returns no match", () => assert.equal(matchesProductSearch(product, "unavailablexyz"), false));
test("clearing search restores every product", () => assert.equal(matchesProductSearch(product, "  "), true));