import type { Json } from "@/integrations/supabase/types";
import type { StoreProduct, StoreSettings } from "./storefront.functions";

export const CATEGORY_ORDER = ["laundry", "kitchen", "toiletries", "fragrance"] as const;
export const CATEGORY_LABELS: Record<string, string> = { laundry: "Laundry", kitchen: "Kitchen", toiletries: "Bathroom", fragrance: "Fragrance" };
export function money(value: number) { return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value).replace("KES", "KSh"); }
export function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
export function productPath(product: Pick<StoreProduct, "id" | "name">) { return `${slugify(product.name)}--${product.id}`; }
export function productIdFromSlug(slug: string) { const match = slug.match(/--([0-9a-f-]{36})$/i); return match?.[1] ?? null; }
export function settingText(settings: StoreSettings, key: string, fallback = "") { const value = settings[key]; return typeof value === "string" && value.trim() ? value : fallback; }
export function settingBoolean(settings: StoreSettings, key: string) { return settings[key] === true; }
export function settingList(settings: StoreSettings, key: string): string[] { const value: Json | undefined = settings[key]; return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
export function availablePrice(product: StoreProduct) { const prices = product.variants.map((v) => v.price_override).filter((v): v is number => v !== null); return prices.length ? Math.min(product.base_price, ...prices) : product.base_price; }
export function stockFor(product: StoreProduct) { return product.variants.length ? product.variants.reduce((sum, v) => sum + v.stock_quantity, 0) : null; }

/* ---- Product-type (subcategory) helpers for the expandable shop filter ---- */
export const TYPE_ORDER: Record<string, string[]> = {
  laundry: ["Laundry Pods", "Scent Boosters", "Stain Removers", "Machine Care", "Colour Catchers", "Fabric Softeners", "Laundry Accessories"],
};
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
export type TypeGroup = { slug: string; name: string; count: number; subs: { name: string; count: number }[] };
export function buildTypeGroups(products: StoreProduct[], only?: string): TypeGroup[] {
  return CATEGORY_ORDER.filter((slug) => !only || slug === only).map((slug) => {
    const inCategory = products.filter((p) => p.category?.slug === slug);
    const counts = new Map<string, number>();
    for (const p of inCategory) { const t = canonicalType(p.subcategory); if (t) counts.set(t, (counts.get(t) ?? 0) + 1); }
    const preferred = TYPE_ORDER[slug] ?? [];
    const subs = [...counts.entries()].map(([name, count]) => ({ name, count }))
      .sort((a, b) => { const ia = preferred.indexOf(a.name), ib = preferred.indexOf(b.name); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name); });
    return { slug, name: CATEGORY_LABELS[slug] ?? slug, count: inCategory.length, subs };
  });
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
