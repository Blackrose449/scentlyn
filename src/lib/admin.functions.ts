import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

type RpcCaller = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

export type AdminProductRow = Database["public"]["Tables"]["products"]["Row"] & {
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; display_order: number }[];
  variants: Database["public"]["Tables"]["product_variants"]["Row"][];
};
export type AdminOrderRow = Database["public"]["Tables"]["orders"]["Row"] & {
  customer: { id: string; full_name: string; phone: string; email: string | null } | null;
  zone: { zone_name: string; delivery_fee: number } | null;
  items: Database["public"]["Tables"]["order_items"]["Row"][];
};

export const ORDER_STATUSES = ["pending", "paid", "packing", "delivered", "cancelled"] as const;
export const LOW_STOCK_THRESHOLD = 8;

const productSelect =
  "*,category:categories(id,name,slug),images:product_images(id,url,display_order),variants:product_variants(*)";
const orderSelect =
  "*,customer:customers(id,full_name,phone,email),zone:delivery_zones(zone_name,delivery_fee),items:order_items(*)";

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const rpc = (context.supabase as { rpc: RpcCaller }).rpc.bind(context.supabase) as RpcCaller;
  const { data, error } = await rpc("is_admin", { _user_id: context.userId });
  if (error || data !== true) throw new Error("Forbidden: admin access required");
}

/* ---------------------------------- access --------------------------------- */

export const getAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rpc = (context.supabase as unknown as { rpc: RpcCaller }).rpc.bind(context.supabase) as RpcCaller;
    const [isAdminResult, existsResult] = await Promise.all([
      rpc("is_admin", { _user_id: context.userId }),
      rpc("admin_exists"),
    ]);
    return {
      userId: context.userId,
      email: (context.claims as { email?: string }).email ?? null,
      isAdmin: isAdminResult.data === true,
      adminExists: existsResult.data === true,
    };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rpc = (context.supabase as unknown as { rpc: RpcCaller }).rpc.bind(context.supabase) as RpcCaller;
    const { data, error } = await rpc("claim_first_admin");
    if (error) throw new Error(error.message);
    return { isAdmin: data === true };
  });

/* --------------------------------- overview -------------------------------- */

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const [ordersResult, productsResult] = await Promise.all([
      context.supabase.from("orders").select(orderSelect).order("created_at", { ascending: false }).limit(200),
      context.supabase.from("products").select(productSelect).is("archived_at", null),
    ]);
    if (ordersResult.error) throw ordersResult.error;
    if (productsResult.error) throw productsResult.error;

    const orders = (ordersResult.data ?? []) as unknown as AdminOrderRow[];
    const products = (productsResult.data ?? []) as unknown as AdminProductRow[];

    const todays = orders.filter((order) => new Date(order.created_at) >= since);
    const lowStock: { id: string; name: string; label: string; quantity: number }[] = [];
    for (const product of products) {
      if (product.variants.length) {
        for (const variant of product.variants) {
          if (variant.stock_quantity <= LOW_STOCK_THRESHOLD)
            lowStock.push({
              id: variant.id,
              name: product.name,
              label: `${variant.variant_type}: ${variant.variant_value}`,
              quantity: variant.stock_quantity,
            });
        }
      } else if (product.stock_quantity <= LOW_STOCK_THRESHOLD) {
        lowStock.push({ id: product.id, name: product.name, label: "No variants", quantity: product.stock_quantity });
      }
    }
    lowStock.sort((a, b) => a.quantity - b.quantity);

    return {
      ordersToday: todays.length,
      revenueToday: todays
        .filter((order) => order.payment_status === "paid")
        .reduce((sum, order) => sum + Number(order.total), 0),
      pendingFulfilment: orders.filter((order) => order.status === "paid" || order.status === "packing").length,
      lowStockCount: lowStock.length,
      recentOrders: orders.slice(0, 8),
      lowStock: lowStock.slice(0, 10),
    };
  });

/* ---------------------------------- orders --------------------------------- */

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ status: z.string().max(20).optional(), search: z.string().max(80).optional() }).parse(data ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let query = context.supabase.from("orders").select(orderSelect).order("created_at", { ascending: false }).limit(300);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw error;
    let orders = (rows ?? []) as unknown as AdminOrderRow[];
    const term = data.search?.trim().toLowerCase();
    if (term) {
      orders = orders.filter(
        (order) =>
          order.order_number.toLowerCase().includes(term) ||
          (order.customer?.full_name ?? "").toLowerCase().includes(term) ||
          (order.customer?.phone ?? "").toLowerCase().includes(term),
      );
    }
    return orders;
  });

export const getOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: order, error } = await context.supabase
      .from("orders")
      .select(orderSelect)
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw error;
    return (order as unknown as AdminOrderRow | null) ?? null;
  });

export const updateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(ORDER_STATUSES).optional(),
        payment_status: z.enum(["pending", "paid", "failed"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const patch: Database["public"]["Tables"]["orders"]["Update"] = {};
    if (data.status) patch.status = data.status;
    if (data.payment_status) patch.payment_status = data.payment_status;
    const { data: order, error } = await context.supabase
      .from("orders")
      .update(patch)
      .eq("id", data.orderId)
      .select(orderSelect)
      .maybeSingle();
    if (error) throw error;
    return (order as unknown as AdminOrderRow | null) ?? null;
  });

/* --------------------------------- products -------------------------------- */

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [productsResult, categoriesResult] = await Promise.all([
      context.supabase.from("products").select(productSelect).order("created_at", { ascending: false }),
      context.supabase.from("categories").select("*").order("display_order"),
    ]);
    if (productsResult.error) throw productsResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    return {
      products: (productsResult.data ?? []) as unknown as AdminProductRow[],
      categories: categoriesResult.data ?? [],
    };
  });

export const getProductForm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ productId: z.string().uuid().nullable() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const categoriesResult = await context.supabase.from("categories").select("*").order("display_order");
    if (categoriesResult.error) throw categoriesResult.error;
    let product: AdminProductRow | null = null;
    if (data.productId) {
      const { data: row, error } = await context.supabase
        .from("products")
        .select(productSelect)
        .eq("id", data.productId)
        .maybeSingle();
      if (error) throw error;
      product = (row as unknown as AdminProductRow | null) ?? null;
    }
    return { product, categories: categoriesResult.data ?? [] };
  });

const productInput = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().min(2).max(160),
  brand: z.string().max(80).nullable(),
  category_id: z.string().uuid().nullable(),
  subcategory: z.string().max(80).nullable(),
  description: z.string().max(4000).nullable(),
  size_label: z.string().max(40).nullable(),
  base_price: z.number().min(0).max(10_000_000),
  stock_quantity: z.number().int().min(0).max(1_000_000),
  is_featured: z.boolean(),
  is_best_seller: z.boolean(),
  status: z.enum(["active", "draft"]),
  variants: z
    .array(
      z.object({
        id: z.string().uuid().nullable(),
        variant_type: z.string().min(1).max(60),
        variant_value: z.string().min(1).max(80),
        price_override: z.number().min(0).max(10_000_000).nullable(),
        stock_quantity: z.number().int().min(0).max(1_000_000),
        sku: z.string().max(60).nullable(),
      }),
    )
    .max(60),
  images: z.array(z.object({ id: z.string().uuid().nullable(), url: z.string().min(5).max(2000) })).max(12),
});

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => productInput.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const db = context.supabase;
    const payload = {
      name: data.name,
      brand: data.brand,
      category_id: data.category_id,
      subcategory: data.subcategory,
      description: data.description,
      size_label: data.size_label,
      base_price: data.base_price,
      stock_quantity: data.stock_quantity,
      is_featured: data.is_featured,
      is_best_seller: data.is_best_seller,
      status: data.status,
    };

    let productId = data.id;
    if (productId) {
      const { error } = await db.from("products").update(payload).eq("id", productId);
      if (error) throw error;
    } else {
      const { data: created, error } = await db.from("products").insert(payload).select("id").single();
      if (error) throw error;
      productId = created.id;
    }

    // variants: replace the set
    const keptVariantIds = data.variants.map((v) => v.id).filter((id): id is string => Boolean(id));
    const existingVariants = await db.from("product_variants").select("id").eq("product_id", productId);
    if (existingVariants.error) throw existingVariants.error;
    const removedVariants = (existingVariants.data ?? []).map((v) => v.id).filter((id) => !keptVariantIds.includes(id));
    if (removedVariants.length) {
      const { error } = await db.from("product_variants").delete().in("id", removedVariants);
      if (error) throw error;
    }
    for (const variant of data.variants) {
      const row = {
        product_id: productId,
        variant_type: variant.variant_type,
        variant_value: variant.variant_value,
        price_override: variant.price_override,
        stock_quantity: variant.stock_quantity,
        sku: variant.sku,
      };
      if (variant.id) {
        const { error } = await db.from("product_variants").update(row).eq("id", variant.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("product_variants").insert(row);
        if (error) throw error;
      }
    }

    // images: replace the set, display_order follows array order
    const keptImageIds = data.images.map((image) => image.id).filter((id): id is string => Boolean(id));
    const existingImages = await db.from("product_images").select("id").eq("product_id", productId);
    if (existingImages.error) throw existingImages.error;
    const removedImages = (existingImages.data ?? []).map((i) => i.id).filter((id) => !keptImageIds.includes(id));
    if (removedImages.length) {
      const { error } = await db.from("product_images").delete().in("id", removedImages);
      if (error) throw error;
    }
    for (const [index, image] of data.images.entries()) {
      if (image.id) {
        const { error } = await db.from("product_images").update({ display_order: index }).eq("id", image.id);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("product_images")
          .insert({ product_id: productId, url: image.url, display_order: index });
        if (error) throw error;
      }
    }

    return { productId };
  });

export const setProductArchived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ productId: z.string().uuid(), archived: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("products")
      .update({
        archived_at: data.archived ? new Date().toISOString() : null,
        ...(data.archived ? { status: "draft" as const } : {}),
      })
      .eq("id", data.productId);
    if (error) throw error;
    return { ok: true };
  });

/* -------------------------------- customers -------------------------------- */

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [customersResult, ordersResult] = await Promise.all([
      context.supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(500),
      context.supabase.from("orders").select("id,customer_id,total,payment_status,created_at").limit(1000),
    ]);
    if (customersResult.error) throw customersResult.error;
    if (ordersResult.error) throw ordersResult.error;
    const orders = ordersResult.data ?? [];
    return (customersResult.data ?? []).map((customer) => {
      const own = orders.filter((order) => order.customer_id === customer.id);
      return {
        ...customer,
        orderCount: own.length,
        lifetimeSpend: own
          .filter((order) => order.payment_status === "paid")
          .reduce((sum, order) => sum + Number(order.total), 0),
        lastOrderAt: own.map((order) => order.created_at).sort().at(-1) ?? null,
      };
    });
  });

export const getCustomerDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ customerId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const [customerResult, ordersResult] = await Promise.all([
      context.supabase.from("customers").select("*").eq("id", data.customerId).maybeSingle(),
      context.supabase
        .from("orders")
        .select(orderSelect)
        .eq("customer_id", data.customerId)
        .order("created_at", { ascending: false }),
    ]);
    if (customerResult.error) throw customerResult.error;
    if (ordersResult.error) throw ordersResult.error;
    if (!customerResult.data) return null;
    return { customer: customerResult.data, orders: (ordersResult.data ?? []) as unknown as AdminOrderRow[] };
  });

/* --------------------------------- settings -------------------------------- */

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [settingsResult, categoriesResult, zonesResult, productsResult] = await Promise.all([
      context.supabase.from("site_settings").select("key,value"),
      context.supabase.from("categories").select("*").order("display_order"),
      context.supabase.from("delivery_zones").select("*").order("delivery_fee"),
      context.supabase.from("products").select("id,name,brand,status").is("archived_at", null).order("name"),
    ]);
    if (settingsResult.error) throw settingsResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    if (zonesResult.error) throw zonesResult.error;
    if (productsResult.error) throw productsResult.error;
    const settings: Record<string, Json> = {};
    for (const row of settingsResult.data ?? []) settings[row.key] = row.value;
    return {
      settings,
      categories: categoriesResult.data ?? [],
      zones: zonesResult.data ?? [],
      products: productsResult.data ?? [],
    };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        entries: z.array(z.object({ key: z.string().min(1).max(60), value: z.unknown() })).min(1).max(40),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    for (const entry of data.entries) {
      const { error } = await context.supabase
        .from("site_settings")
        .upsert({ key: entry.key, value: entry.value as Json }, { onConflict: "key" });
      if (error) throw error;
    }
    return { ok: true };
  });

export const saveCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        categories: z
          .array(
            z.object({
              id: z.string().uuid(),
              name: z.string().min(2).max(60),
              display_order: z.number().int().min(0).max(99),
              icon_url: z.string().max(2000).nullable(),
            }),
          )
          .min(1)
          .max(20),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    for (const category of data.categories) {
      const { error } = await context.supabase
        .from("categories")
        .update({ name: category.name, display_order: category.display_order, icon_url: category.icon_url })
        .eq("id", category.id);
      if (error) throw error;
    }
    return { ok: true };
  });

export const saveDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable(),
        zone_name: z.string().min(2).max(80),
        delivery_fee: z.number().min(0).max(100_000),
        is_active: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const row = { zone_name: data.zone_name, delivery_fee: data.delivery_fee, is_active: data.is_active };
    if (data.id) {
      const { error } = await context.supabase.from("delivery_zones").update(row).eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("delivery_zones").insert(row);
      if (error) throw error;
    }
    return { ok: true };
  });
