import { z } from "zod";

export const productInput = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().min(2).max(160),
  brand: z.string().max(80).nullable(),
  category_id: z.string().uuid().nullable(),
  extra_category_ids: z.array(z.string().uuid()).max(12).default([]),
  subcategory: z.string().max(80).nullable(),
  description: z.string().max(4000).nullable(),
  // Older deployed editors omit this optional field. Preserve it on edits.
  size_label: z.string().max(40).nullable().optional(),
  base_price: z.number().min(0).max(10_000_000),
  stock_quantity: z.number().int().min(0).max(1_000_000),
  is_featured: z.boolean(),
  is_best_seller: z.boolean(),
  status: z.enum(["active", "draft"]),
  variants: z.array(z.object({
    id: z.string().uuid().nullable(),
    variant_type: z.string().min(1).max(60),
    variant_value: z.string().min(1).max(80),
    price_override: z.number().min(0).max(10_000_000).nullable(),
    stock_quantity: z.number().int().min(0).max(1_000_000),
    sku: z.string().max(60).nullable(),
  })).max(60),
  images: z.array(z.object({ id: z.string().uuid().nullable(), url: z.string().min(5).max(2000) })).max(12),
});

export function optionalSizePayload(data: { size_label?: string | null | undefined }): { size_label?: string | null } {
  return data.size_label === undefined ? {} : { size_label: data.size_label };
}