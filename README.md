# Scentlyn Backend

Backend build prompt — Scentlyn (Supabase/Postgres)

Set up the backend for Scentlyn, a Kenyan e-commerce site selling laundry, kitchen, toiletries, and fragrance products. Use Supabase (Postgres + Auth + Storage + Edge Functions).

Tables

categories
  id, name, slug, display_order, icon_url

products
  id, name, brand, category_id (fk), subcategory,
  description, base_price, is_featured (bool),
  is_best_seller (bool), status (active/draft),
  created_at, updated_at

product_variants
  id, product_id (fk), variant_type (e.g. "scent", "pack_size"),
  variant_value (e.g. "Spring awakening", "176g"),
  price_override (nullable), stock_quantity, sku

product_images
  id, product_id (fk), url, display_order

customers
  id, full_name, phone, email (nullable), created_at

delivery_zones
  id, zone_name, delivery_fee, is_active

orders
  id, customer_id (fk), status (pending/paid/packing/delivered/cancelled),
  payment_method (mpesa/card/cod), payment_status (pending/paid/failed),
  delivery_zone_id (fk), delivery_address_note,
  subtotal, delivery_fee, total, created_at

order_items
  id, order_id (fk), product_id (fk), variant_id (fk, nullable),
  quantity, unit_price, line_total

site_settings
  id, key (unique), value (jsonb)
  -- used for: hero_headline, hero_subtext, hero_image_url, trust_badges,
  -- featured_product_ids, promo_banner_text, promo_banner_enabled,
  -- store_phone, store_whatsapp, store_hours, store_address


Auth

Row Level Security on all tables

Public (anon) role: read-only on products, product_variants, product_images, categories, delivery_zones, site_settings

Authenticated admin role: full read/write on everything, gated by a is_admin claim or a separate admin_users table

Customers table: insert-only from public (created during checkout), no public read of other customers' data

Edge Functions

checkout-create-order — validates cart payload server-side (prices, stock), creates orders + order_items, returns order ID

mpesa-stk-push — triggers Daraja STK push using order total + customer phone; stores the CheckoutRequestID against the order

mpesa-callback — receives Safaricom's callback, verifies it, updates payment_status and status on the order

card-payment-init — initiates a card charge via Flutterwave or Pesapal (whichever is chosen), returns a redirect/checkout URL

payment-webhook — shared or gateway-specific webhook handler that updates order status on payment confirmation

Keep all payment provider API keys as Supabase secrets, never in client code. Stub the actual gateway calls behind clearly marked TODOs if real credentials aren't available yet, but keep the function structure, request/response shape, and DB writes fully real so credentials can be dropped in later without restructuring.

Storage

A product-images bucket, public read, admin-only write, for product photography once provided

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://scentlyn.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/606380c4-1986-4a3d-8c52-35ff6dd02a64).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
