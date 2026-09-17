import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Store catalogue is unavailable.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type StoreProduct = Database["public"]["Tables"]["products"]["Row"] & {
  category: { name: string; slug: string } | null;
  images: { id: string; url: string; display_order: number }[];
  variants: Database["public"]["Tables"]["product_variants"]["Row"][];
};
export type StoreCategory = Database["public"]["Tables"]["categories"]["Row"];
export type StoreSettings = Record<string, Json>;

const productSelect = `id,name,brand,category_id,subcategory,description,base_price,is_featured,is_best_seller,status,created_at,updated_at,category:categories(name,slug),images:product_images(id,url,display_order),variants:product_variants(*)`;

function normalizeProduct(row: unknown): StoreProduct {
  const value = row as StoreProduct;
  return {
    ...value,
    images: [...(value.images ?? [])].sort((a, b) => a.display_order - b.display_order),
    variants: value.variants ?? [],
  };
}

export const getStorefrontHome = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicClient();
  const [categoriesResult, productsResult, settingsResult] = await Promise.all([
    db.from("categories").select("*").order("display_order"),
    db.from("products").select(productSelect).eq("status", "active"),
    db.from("site_settings").select("key,value"),
  ]);
  if (categoriesResult.error) throw categoriesResult.error;
  if (productsResult.error) throw productsResult.error;
  if (settingsResult.error) throw settingsResult.error;
  const settings: StoreSettings = {};
  for (const setting of settingsResult.data ?? []) settings[setting.key] = setting.value;
  const products = (productsResult.data ?? []).map(normalizeProduct);
  const featuredIds = Array.isArray(settings.featured_product_ids)
    ? settings.featured_product_ids.filter((id): id is string => typeof id === "string")
    : [];
  const featured = featuredIds.length
    ? featuredIds.map((id) => products.find((p) => p.id === id)).filter((p): p is StoreProduct => Boolean(p))
    : products.filter((p) => p.is_featured);
  return { categories: categoriesResult.data ?? [], featured, settings };
});

export const getCategoryPage = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const db = publicClient();
    const { data: category, error: categoryError } = await db.from("categories").select("*").eq("slug", data.slug).maybeSingle();
    if (categoryError) throw categoryError;
    if (!category) return null;
    const { data: products, error } = await db.from("products").select(productSelect).eq("category_id", category.id).eq("status", "active");
    if (error) throw error;
    return { category, products: (products ?? []).map(normalizeProduct) };
  });

export const getProductPage = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ productId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const db = publicClient();
    const { data: product, error } = await db.from("products").select(productSelect).eq("id", data.productId).eq("status", "active").maybeSingle();
    if (error) throw error;
    if (!product) return null;
    const normalized = normalizeProduct(product);
    const { data: related, error: relatedError } = await db.from("products").select(productSelect).eq("category_id", normalized.category_id ?? "").eq("status", "active").neq("id", normalized.id).limit(5);
    if (relatedError) throw relatedError;
    return { product: normalized, related: (related ?? []).map(normalizeProduct) };
  });

export const getDeliveryZones = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicClient();
  const { data, error } = await db.from("delivery_zones").select("id,zone_name,delivery_fee,is_active").eq("is_active", true).order("delivery_fee");
  if (error) throw error;
  return data ?? [];
});
