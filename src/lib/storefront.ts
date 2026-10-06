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
