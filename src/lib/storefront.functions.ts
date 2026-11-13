import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";
import { campaignIsLive, parseCampaigns, type StoreCampaign } from "./storefront";

function publicClient() {
  const url = process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_ANON_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Store catalogue is unavailable.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type StoreProduct = Database["public"]["Tables"]["products"]["Row"] & {
  category: { name: string; slug: string } | null;
  images: { id: string; url: string; display_order: number }[];
  variants: Database["public"]["Tables"]["product_variants"]["Row"][];
  category_slugs: string[];
};
export type StoreCategory = Database["public"]["Tables"]["categories"]["Row"];
export type StoreProductType = Database["public"]["Tables"]["product_types"]["Row"];
export type StoreSettings = Record<string, Json>;

const productSelect = `id,name,brand,category_id,extra_category_ids,subcategory,description,base_price,size_label,stock_quantity,is_featured,is_best_seller,status,created_at,updated_at,category:categories(name,slug),images:product_images(id,url,display_order),variants:product_variants(*)`;
const categorySelect = "id,name,slug,icon_url,display_order,is_active";
const typeSelect = "category_id,name,display_order";

type CategorySlugs = Map<string, string>; // category id -> slug

async function loadCategorySlugs(db: ReturnType<typeof publicClient>): Promise<CategorySlugs> {
  const { data, error } = await db.from("categories").select("id,slug");
  if (error) throw error;
  const map: CategorySlugs = new Map();
  for (const row of data ?? []) map.set(row.id, row.slug);
  return map;
}

function normalizeProduct(row: unknown, categorySlugsById?: CategorySlugs): StoreProduct {
  const value = row as Omit<StoreProduct, "category_slugs">;
  const slugs = new Set<string>();
  if (value.category?.slug) slugs.add(value.category.slug);
  for (const id of value.extra_category_ids ?? []) {
    const slug = categorySlugsById?.get(id);
    if (slug) slugs.add(slug);
  }
  return {
    ...value,
    images: [...(value.images ?? [])].sort((a, b) => a.display_order - b.display_order),
    // Variants keep the order the owner set in admin: first variant is the default.
    variants: (value.variants ?? []).sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.created_at.localeCompare(b.created_at),
    ),
    category_slugs: [...slugs],
  };
}

export const getStorefrontHome = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicClient();
  const [categoriesResult, settingsResult] = await Promise.all([
    db.from("categories").select("*").order("display_order"),
    db.from("site_settings").select("key,value"),
  ]);
  if (categoriesResult.error) throw categoriesResult.error;
  if (settingsResult.error) throw settingsResult.error;
  const settings: StoreSettings = {};
  for (const setting of settingsResult.data ?? []) settings[setting.key] = setting.value;
  const slugMap: CategorySlugs = new Map();
  for (const row of categoriesResult.data ?? []) slugMap.set(row.id, row.slug);
  const featuredIds = Array.isArray(settings["featured_product_ids"])
    ? settings["featured_product_ids"].filter((id): id is string => typeof id === "string")
    : [];
  const liveCampaigns = parseCampaigns(settings["campaigns"]).filter((c) => campaignIsLive(c)).slice(0, 6);
  const featuredQuery = db.from("products").select(productSelect).eq("status", "active");
  const campaignIds = [...new Set(liveCampaigns.flatMap((c) => c.product_ids))];
  const [productsResult, campaignResult] = await Promise.all([
    featuredIds.length ? featuredQuery.in("id", featuredIds) : featuredQuery.eq("is_featured", true).limit(8),
    campaignIds.length
      ? db.from("products").select("id,name").eq("status", "active").in("id", campaignIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsResult.error) throw productsResult.error;
  if (campaignResult.error) throw campaignResult.error;
  const products = (productsResult.data ?? []).map((row) => normalizeProduct(row, slugMap));
  const featured = featuredIds.length
    ? featuredIds.map((id) => products.find((p) => p.id === id)).filter((p): p is StoreProduct => Boolean(p))
    : products.filter((p) => p.is_featured);
  const campaigns: StoreCampaign[] = liveCampaigns.map((c) => ({
    ...c,
    products: c.product_ids.flatMap((id) => {
      const product = campaignResult.data?.find((p) => p.id === id);
      return product ? [{ id: product.id, name: product.name }] : [];
    }),
  }));
  return { categories: categoriesResult.data ?? [], featured, settings, campaigns };
});

export const getCategoryPage = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const db = publicClient();
    if (data.slug === "all") {
      const [allResult, categoriesResult, typesResult] = await Promise.all([
        db.from("products").select(productSelect).eq("status", "active"),
        db.from("categories").select(categorySelect).order("display_order"),
        db.from("product_types").select(typeSelect).order("display_order"),
      ]);
      if (allResult.error) throw allResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (typesResult.error) throw typesResult.error;
      const slugMap: CategorySlugs = new Map();
      for (const row of categoriesResult.data ?? []) slugMap.set(row.id, row.slug);
      const now = new Date().toISOString();
      return {
        category: { id: "all", name: "All products", slug: "all", display_order: 0, icon_url: null, created_at: now, updated_at: now } as StoreCategory,
        products: (allResult.data ?? []).map((row) => normalizeProduct(row, slugMap)),
        categories: categoriesResult.data ?? [],
        types: typesResult.data ?? [],
      };
    }
    const [categoryResult, categoriesResult, typesResult] = await Promise.all([
      db.from("categories").select(categorySelect).eq("slug", data.slug).maybeSingle(),
      db.from("categories").select(categorySelect).order("display_order"),
      db.from("product_types").select(typeSelect).order("display_order"),
    ]);
    if (categoryResult.error) throw categoryResult.error;
    if (!categoryResult.data) return null;
    const category = categoryResult.data;
    const { data: products, error } = await db
      .from("products")
      .select(productSelect)
      .eq("status", "active")
      .or(`category_id.eq.${category.id},extra_category_ids.cs.{${category.id}}`);
    if (error) throw error;
    const slugMap: CategorySlugs = new Map();
    for (const row of categoriesResult.data ?? []) slugMap.set(row.id, row.slug);
    return {
      category,
      products: (products ?? []).map((row) => normalizeProduct(row, slugMap)),
      categories: categoriesResult.data ?? [],
      types: typesResult.data ?? [],
    };
  });

export const getProductPage = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ productId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const db = publicClient();
    const [productResult, slugMap] = await Promise.all([
      db.from("products").select(productSelect).eq("id", data.productId).eq("status", "active").maybeSingle(),
      loadCategorySlugs(db),
    ]);
    if (productResult.error) throw productResult.error;
    if (!productResult.data) return null;
    const normalized = normalizeProduct(productResult.data, slugMap);
    // Related: same main category, or any of this product's extra categories.
    const categoryIds = [...new Set([normalized.category_id, ...normalized.extra_category_ids].filter((id): id is string => Boolean(id)))];
    const { data: related, error: relatedError } = await db
      .from("products")
      .select(productSelect)
      .eq("status", "active")
      .neq("id", normalized.id)
      .or(categoryIds.map((id) => `category_id.eq.${id}`).join(","))
      .limit(5);
    if (relatedError) throw relatedError;
    return { product: normalized, related: (related ?? []).map((row) => normalizeProduct(row, slugMap)) };
  });

export const getDeliveryZones = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicClient();
  const { data, error } = await db.from("delivery_zones").select("id,zone_name,delivery_fee,is_active").eq("is_active", true).order("delivery_fee");
  if (error) throw error;
  return data ?? [];
});

export const getCampaignPage = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string().min(1).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const db = publicClient();
    const { data: row, error } = await db.from("site_settings").select("value").eq("key", "campaigns").maybeSingle();
    if (error) throw error;
    const campaign = parseCampaigns(row?.value).find((c) => c.id === data.id);
    if (!campaign || !campaignIsLive(campaign)) return null;
    if (!campaign.product_ids.length) return { campaign, products: [] as StoreProduct[] };
    const [productsResult, slugMap] = await Promise.all([
      db.from("products").select(productSelect).in("id", campaign.product_ids).eq("status", "active"),
      loadCategorySlugs(db),
    ]);
    if (productsResult.error) throw productsResult.error;
    const ordered = campaign.product_ids.map((id) => (productsResult.data ?? []).find((p) => p.id === id)).filter(Boolean).map((p) => normalizeProduct(p, slugMap));
    return { campaign, products: ordered };
  });
