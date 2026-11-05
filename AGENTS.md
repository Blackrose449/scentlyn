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
- The `categories` and `product_types` tables are the single source of truth for storefront navigation and the "Shop by type" filter — never hard-code category lists in components; a pre-render fallback list exists only to avoid a header flash.
- `products.category_id` is the main category and `extra_category_ids` holds optional extra placements. A product appears in its main and extra categories, but product types (subcategories) only count under the main category.
- `product_variants.display_order` fixes the variant order saved in admin; the first variant is a product page's default. Never let client code default to the last variant.
