import type { StoreProduct } from "./storefront.functions";
import { STOREFRONT_STALE_TIME } from "./storefront-cache-policy";

/** Reuse only fresh, public catalogue rows; checkout always validates live stock. */
export function findCatalogueProduct(entries: { updatedAt: number; products: StoreProduct[] }[], productId: string, now = Date.now()): { product: StoreProduct; updatedAt: number } | undefined {
  for (const entry of entries) {
    if (now - entry.updatedAt >= STOREFRONT_STALE_TIME) continue;
    const product = entry.products.find((row) => row.id === productId);
    if (product) return { product, updatedAt: entry.updatedAt };
  }
  return undefined;
}