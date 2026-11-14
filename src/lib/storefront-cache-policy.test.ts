import assert from "node:assert/strict";
import { test } from "node:test";
import { STOREFRONT_STALE_TIME } from "./storefront-cache-policy";

test("public product and category freshness lasts five minutes", () => {
  assert.equal(STOREFRONT_STALE_TIME, 300_000);
});