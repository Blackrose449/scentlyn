import type { StoreProduct } from "@/lib/storefront.functions";

export type Option = {
  id: string;
  label: string;
  price: number;
  stock: number;
  image: string | null;
  variantId: string | null;
};

const SIZE_AT_END = /\s*[-–—]?\s*(\d+(?:[.,]\d+)?\s*(?:sheets?|pcs?|pieces?|pods?|capsules?|tablets?|tabs?|wipes?|rolls?|packs?|kg|g|ml|l|litres?|liters?))\s*$/i;

/** Sellers type the main product's size into its name (e.g. "Dylon Colour Catcher 52 Sheets"). Split it out. */
export function splitBaseSize(name: string): { title: string; size: string | null } {
  const m = name.match(SIZE_AT_END);
  if (!m || !m[1] || m.index === undefined || m.index === 0) return { title: name, size: null };
  return { title: name.slice(0, m.index).trim(), size: m[1].trim().toLowerCase() };
}

/** Main product's size: the admin "Size / option" field first, else read from the end of the name. */
export function baseInfo(product: StoreProduct): { title: string; size: string | null } {
  const label = product.size_label?.trim();
  return label ? { title: product.name, size: label.toLowerCase() } : splitBaseSize(product.name);
}

/** Main product first (when its size is in the name), then every variant. */
export function buildOptions(product: StoreProduct): Option[] {
  const { size } = baseInfo(product);
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const options: Option[] = [];
  if (product.variants.length && size && !product.variants.some((v) => norm(v.variant_value) === norm(size))) {
    options.push({ id: "base", label: size, price: product.base_price, stock: product.stock_quantity ?? 0, image: null, variantId: null });
  }
  for (const v of product.variants) {
    options.push({ id: v.id, label: v.variant_value, price: v.price_override ?? product.base_price, stock: v.stock_quantity, image: null, variantId: v.id });
  }
  return options.map((o, i) => ({ ...o, image: product.images[i]?.url ?? product.images[0]?.url ?? null }));
}

export const stockLabel = (stock: number) => (stock > 0 ? "In stock" : "Out of stock");
