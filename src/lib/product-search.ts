type SearchProduct = {
  name: string;
  brand?: string | null;
  description?: string | null;
  subcategory?: string | null;
  category?: { name: string; slug: string } | null;
  category_slugs?: string[];
  variants?: { variant_value: string }[];
};

export function matchesProductSearch(product: SearchProduct, query: string, categories: { name: string; slug: string }[] = []): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const text = [product.name, product.brand, product.description, product.subcategory,
    product.category?.name, product.category?.slug, ...(product.category_slugs ?? []),
    ...categories.filter((c) => product.category_slugs?.includes(c.slug)).map((c) => c.name),
    ...(product.variants ?? []).map((v) => v.variant_value)].filter(Boolean).join(" ").toLowerCase();
  return terms.every((term) => text.includes(term));
}