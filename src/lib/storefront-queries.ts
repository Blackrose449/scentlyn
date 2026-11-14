import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { getStorefrontShell, getProductPage, getRelatedProducts, type StoreProduct, type StoreSettings, type StoreCategory } from "./storefront.functions";
import { productIdFromSlug } from "./storefront";
import { findCatalogueProduct } from "./catalogue-cache";
import { STOREFRONT_STALE_TIME } from "./storefront-cache-policy";

export const shellQuery = (client: QueryClient) => queryOptions({
  queryKey: ["storefront-shell"], queryFn: () => getStorefrontShell(), staleTime: STOREFRONT_STALE_TIME,
  initialData: () => {
    const home = client.getQueryData<{ categories: StoreCategory[]; settings: StoreSettings }>(["storefront-home"]);
    return home ? { categories: home.categories, settings: home.settings } : undefined;
  },
  initialDataUpdatedAt: () => client.getQueryState(["storefront-home"])?.dataUpdatedAt,
});

export const productQuery = (slug: string) => {
  const productId = productIdFromSlug(slug);
  return queryOptions({ queryKey: ["product", productId], queryFn: () => productId ? getProductPage({ data: { productId } }) : Promise.resolve(null), staleTime: STOREFRONT_STALE_TIME });
};

export function seedProductQuery(client: QueryClient, slug: string) {
  const id = productIdFromSlug(slug);
  if (!id || client.getQueryData(["product", id])) return;
  const entries = client.getQueryCache().findAll().flatMap((query) => {
    if (!["category", "storefront-home", "campaign"].includes(String(query.queryKey[0]))) return [];
    const data = query.state.data as { products?: StoreProduct[]; featured?: StoreProduct[] } | undefined;
    return [{ updatedAt: query.state.dataUpdatedAt, products: data?.products ?? data?.featured ?? [] }];
  });
  const found = findCatalogueProduct(entries, id);
  if (found) client.setQueryData(["product", id], { product: found.product }, { updatedAt: found.updatedAt });
}

export const relatedQuery = (productId: string) => queryOptions({ queryKey: ["related-products", productId], queryFn: () => getRelatedProducts({ data: { productId } }), staleTime: STOREFRONT_STALE_TIME });