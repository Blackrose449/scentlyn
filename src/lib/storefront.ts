import type { Json } from "@/integrations/supabase/types";
import type { StoreCategory, StoreProduct, StoreSettings } from "./storefront.functions";

export function money(value: number) { return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value).replace("KES", "KSh"); }
export function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
export function productPath(product: Pick<StoreProduct, "id" | "name">) { return `${slugify(product.name)}--${product.id}`; }
export function productIdFromSlug(slug: string) { const match = slug.match(/--([0-9a-f-]{36})$/i); return match?.[1] ?? null; }
export function settingText(settings: StoreSettings, key: string, fallback = "") { const value = settings[key]; return typeof value === "string" && value.trim() ? value : fallback; }
export function settingBoolean(settings: StoreSettings, key: string) { return settings[key] === true; }
export function settingList(settings: StoreSettings, key: string): string[] { const value: Json | undefined = settings[key]; return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
export function availablePrice(product: StoreProduct) { const prices = product.variants.map((v) => v.price_override).filter((v): v is number => v !== null); return prices.length ? Math.min(product.base_price, ...prices) : product.base_price; }
export function stockFor(product: StoreProduct) { return product.variants.length ? product.variants.reduce((sum, v) => sum + v.stock_quantity, 0) : null; }

/* ---- Categories: the categories table is the single source of truth ---- */
export type CategoryLink = { slug: string; name: string };
/** Rendered only until the live category list arrives (prevents a blank header while loading). */
export const FALLBACK_CATEGORIES: CategoryLink[] = [
  { slug: "laundry", name: "Laundry" },
  { slug: "kitchen", name: "Kitchen" },
  { slug: "toiletries", name: "Bathroom" },
  { slug: "fragrance", name: "Fragrance" },
];
export function activeCategories(categories: StoreCategory[]): StoreCategory[] {
  return categories
    .filter((c) => c.is_active)
    .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));
}

/* ---- Product-type (subcategory) helpers for the expandable shop filter ---- */
const TYPE_ALIASES: Record<string, string> = {
  laundrypod: "Laundry Pods", laundrycapsule: "Laundry Pods", pod: "Laundry Pods", capsule: "Laundry Pods",
  scentbooster: "Scent Boosters", inwashscentbooster: "Scent Boosters",
  stainremover: "Stain Removers",
  machinecare: "Machine Care",
  colourcatcher: "Colour Catchers", colorcatcher: "Colour Catchers",
  fabricsoftener: "Fabric Softeners", fabricconditioner: "Fabric Softeners",
  accessorie: "Laundry Accessories", laundryaccessorie: "Laundry Accessories",
  kitchencleaner: "Kitchen Cleaners", bodywash: "Body Wash",
};
/** Merges spelling/case/plural variants ("Scent booster" / "Scent Booster") into one filter label. */
export function canonicalType(raw: string | null | undefined): string | null {
  const text = raw?.trim().replace(/\s+/g, " ");
  if (!text) return null;
  const key = text.toLowerCase().replace(/[^a-z]/g, "").replace(/s$/, "");
  return TYPE_ALIASES[key] ?? text.replace(/\b\w/g, (c) => c.toUpperCase());
}
/** Matches a product's type against the admin-managed type names first, else canonicalizes it. */
export function typeName(raw: string | null | undefined, known: string[]): string | null {
  const base = canonicalType(raw);
  if (!base) return null;
  return known.find((name) => name.toLowerCase() === base.toLowerCase()) ?? base;
}
export type TypeGroup = { slug: string; name: string; count: number; subs: { name: string; count: number }[] };
export type StoreTypeRef = { category_id: string; name: string; display_order?: number };
/**
 * Builds the "Shop by type" groups. A product counts towards a category when its main
 * category or one of its extra categories matches; product types are only counted under
 * a product's main category.
 */
export function buildTypeGroups(products: StoreProduct[], categories: StoreCategory[], types: StoreTypeRef[], only?: string): TypeGroup[] {
  return activeCategories(categories)
    .filter((c) => !only || c.slug === only)
    .map((c) => {
      const known = types.filter((t) => t.category_id === c.id);
      const knownNames = known.map((t) => t.name);
      const inCategory = products.filter((p) => p.category_slugs?.includes(c.slug));
      const counts = new Map<string, number>();
      for (const p of inCategory) {
        if (p.category_id !== c.id) continue;
        const t = typeName(p.subcategory, knownNames);
        if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
      }
      const preferred = [...known].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)).map((t) => t.name);
      const subs = [...counts.entries()].map(([name, count]) => ({ name, count }))
        .sort((a, b) => { const ia = preferred.indexOf(a.name), ib = preferred.indexOf(b.name); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name); });
      return { slug: c.slug, name: c.name, count: inCategory.length, subs };
    });
}

/* ---- Last browsed shop page (for "Continue shopping") ---- */
export type LastShopPage = { kind: "category"; slug: string; search?: Record<string, unknown> } | { kind: "product"; slug: string };
const LAST_SHOP_KEY = "scentlyn-last-shop-page";
export function rememberShopPage(page: LastShopPage) { try { sessionStorage.setItem(LAST_SHOP_KEY, JSON.stringify(page)); } catch { /* storage unavailable */ } }
export function lastShopPage(): LastShopPage | null {
  try {
    const raw = sessionStorage.getItem(LAST_SHOP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastShopPage;
    if ((parsed?.kind === "category" || parsed?.kind === "product") && typeof parsed.slug === "string" && parsed.slug) return parsed;
  } catch { /* storage unavailable */ }
  return null;
}

/* ---- Campaigns (promo image / video / poster, optionally linked to products) ---- */
export type Campaign = {
  id: string;
  title: string;
  media_type: "image" | "video";
  media_url: string;
  poster_url: string;
  product_ids: string[];
  enabled: boolean;
  ends_at: string; // yyyy-mm-dd, optional
};
export type StoreCampaign = Campaign & { products: { id: string; name: string }[] };

export function parseCampaigns(value: Json | undefined): Campaign[] {
  if (!Array.isArray(value)) return [];
  const out: Campaign[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const c = item as Record<string, Json>;
    if (typeof c["id"] !== "string" || typeof c["media_url"] !== "string" || !c["media_url"]) continue;
    out.push({
      id: c["id"],
      title: typeof c["title"] === "string" ? c["title"] : "",
      media_type: c["media_type"] === "video" ? "video" : "image",
      media_url: c["media_url"],
      poster_url: typeof c["poster_url"] === "string" ? c["poster_url"] : "",
      product_ids: Array.isArray(c["product_ids"]) ? c["product_ids"].filter((x): x is string => typeof x === "string") : [],
      enabled: c["enabled"] !== false,
      ends_at: typeof c["ends_at"] === "string" ? c["ends_at"] : "",
    });
  }
  return out;
}
export function campaignIsLive(c: Campaign, now = new Date()) {
  if (!c.enabled) return false;
  if (!c.ends_at) return true;
  const end = new Date(`${c.ends_at}T23:59:59+03:00`); // East Africa Time
  return Number.isNaN(end.getTime()) || end >= now;
}
