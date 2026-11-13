<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Product navigation reuses public catalogue rows only within their existing 60-second freshness window; recommendations load separately and never block purchasing, while checkout validates live prices and stock.
- Shared storefront navigation reads categories/contact settings rather than loading homepage products; fonts ship as local Latin variable assets to remove third-party stylesheet waits.
- Reserve at least a viewport of storefront main content and provide a route pending skeleton so streaming or delayed page reads never bring the footer into the opening screen.
- Hydrate the request-scoped QueryClient through router SSR Query integration; preserve the root provider so storefront data is reused without hydration mismatches or duplicate initial fetches.
- Keep homepage product reads scoped to featured cards and live campaign references, use compressed bundled storefront media, and preload only the homepage's main image to reduce downloads without caching private checkout data.
- The `categories` and `product_types` tables are the single source of truth for storefront navigation and the "Shop by type" filter — never hard-code category lists in components; a pre-render fallback list exists only to avoid a header flash.
- `products.category_id` is the main category and `extra_category_ids` holds optional extra placements. A product appears in its main and extra categories, but product types (subcategories) only count under the main category.
- `product_variants.display_order` fixes the variant order saved in admin; the first variant is a product page's default. Never let client code default to the last variant.
- Checkout creates the customer, order, line items, and stock deductions in one database transaction so partial orders and overselling cannot occur.
- Online payment starts only after the order is saved; payment failures must leave that order accessible with a retry path rather than inviting duplicate checkout submissions.
- Checkout retries reuse a browser-scoped attempt key enforced by an advisory transaction lock, preventing duplicate order creation after delayed responses.
- Online payment methods share a server-only Pesapal initiation helper so checkout and retries use the same provider and verified IPN path; legacy Till orders retain their receipt flow.
- Guest order reads and mutations require an HttpOnly browser cookie matching the saved checkout key; an order ID alone is never authorization.
- Preserve checkout metadata across payment changes; callbacks must match the stored tracking ID, merchant reference, exact amount and currency, and must not downgrade paid or fulfilled orders.
