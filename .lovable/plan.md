# Scentlyn customer storefront

## Goal
Build a mobile-first shopping experience matching the supplied Scentlyn mockup: editorial home styling, navy/ivory/soft-blue palette, restrained champagne-gold accents, and the exact category order Laundry, Kitchen, Toiletries, Fragrance.

## What will be built
- Replace the blank home screen with the complete storefront: announcement strip, responsive header and category navigation, editable home feature area, four category cards, favourites, trust strip, conditional promotion, newsletter area, and footer.
- Add separate category, product, cart, checkout, and order-status pages with route-specific search/social metadata.
- Add reusable storefront pieces for the header, footer, product cards, image placeholders, loading skeletons, quantity controls, breadcrumbs, badges, and empty/error states.
- Add a persistent cart stored in the shopper’s browser, with variant-aware line items, quantity updates, removal, totals, cart count, and checkout handoff.
- Connect every catalogue view to Supabase. Products, variants, category names, product images, delivery zones, store details, home copy, promotion settings, and featured product IDs remain database-driven.
- Connect checkout to the existing secure order, M-Pesa, Pesapal, cash-on-delivery, and order-status functions. M-Pesa will show a polling “Check your phone” state and preserve entered details for retries.

## Page behavior
### Home
- Reproduce the reference hierarchy and proportions rather than embedding the screenshot itself.
- Use `site_settings` for home headline, supporting text, hero image, featured IDs, trust content, promotion, and store details.
- Keep the four fixed business categories in the approved display order, while using their database records and image URLs.
- Show polished empty states until products and image URLs are added; the database currently contains zero products and zero product images.

### Category listing
- Use `/category/$slug` with breadcrumb, title, subcategory filters, sort selection, result count, responsive grid, best-seller and low-stock states, and no-results feedback.
- Store filters and sorting in the URL so links can be shared and browser navigation works naturally.

### Product detail
- Use a readable product URL containing the name slug plus product ID, without requiring a database schema change.
- Render gallery, brand, product name, database-backed price, grouped variants, live stock/price changes, quantity, add-to-cart, trust notes, description, and related products.
- Ratings will only render when a real rating source exists; no rating or review count will be invented.
- Add Product structured data and product-specific title, description, and social metadata.

### Cart and checkout
- Cart editing persists across reloads and validates chosen variants before order submission.
- Checkout loads live delivery zones and calculates the displayed fee instantly; the server remains authoritative for the final total.
- Payment methods: M-Pesa, Card via Pesapal, and cash on delivery. Card selection will hand shoppers to Pesapal’s hosted secure form rather than collecting card numbers inside Scentlyn.
- Confirmation and payment-return pages use the existing order-status function and display the saved order number.

## Visual system and performance
- Define semantic tokens matching #DCE8EF, #F7F3EA, #16324F, #B48A4A, and #FFFFFF; keep gold limited to highlights.
- Load Cormorant Garamond for display text and Manrope for interface text.
- Follow the mockup’s dense, polished merchandising layout while adapting it carefully for narrow TikTok-origin phone screens.
- Use lazy-loaded, aspect-ratio-stable images with responsive sizing, meaningful alt text, and skeletons to avoid layout jumps and blank flashes.
- Use the uploaded product photographs only as source material for later catalogue uploads; they will not be hardcoded into products or substituted for missing database records.

## Technical details
- Add public read-only TanStack server functions for catalogue/settings data and prime TanStack Query from route loaders for server-rendered first paint.
- Add route-level error and not-found states to every data route.
- Reuse the existing checkout functions and shadcn controls; no payment secrets enter browser code.
- Keep the existing Supabase schema and RLS unchanged.
- Verify current diagnostics, build output, desktop and mobile layouts, cart persistence, filters, checkout method switching, payment waiting/retry states, image loading, and metadata output.
