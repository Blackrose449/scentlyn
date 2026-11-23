# Current storefront refinements

## November 23 requested corrections
- [x] Cross-site sweep: browser-tested live search/empty/clear on All products, Laundry, Kitchen, Bathroom and Fragrance. Read shared home/offer/recommendation cards, product options, cart persistence, checkout, saved-order display, product create/update validation and the latest checkout SQL; chosen variant IDs/prices flow through unchanged. Root icons/brand descriptions are shared; page-specific metadata remains intact. No further violations of the requested rules found; no settled orders, permissions or unrelated settings changed.
- [x] Remove multi-option product summary price/text; verified chosen 40-sheet option at KSh 2,500 in cart after reload and checkout total KSh 2,600 with the current KSh 100 delivery fee at 390/1280px; single-product addition also passes.
- [x] Fix live shop search and header search navigation; names, categories, description keywords, no results and clearing back to all 33 products pass on mobile/desktop, with no runtime errors.
- [x] Apply exact site description and regenerate logo icons with v=3; verified all three metadata descriptions, footer text, three head links and 48/192/512/180px served icons. Live custom-domain favicon already shows the Scentlyn logo; new links need redeployment. No manifest or obsolete favicon.png/favicon.svg exists.
- [x] Correct screenshot's missing size_label validation, preserving existing labels when older editors omit the field; 25 relevant tests pass and latest build is OK.
- [ ] Verify an authenticated product save on the external admin site and publishing; no managed admin session is available and no separate publishing error was supplied.

## Site icon replacement
- [x] Regenerate all five requested public icons from the uploaded logo, remove obsolete favicon.png/favicon.svg, and use exactly three versioned icon links; no index.html or manifest exists, and sharing tags contain Scentlyn imagery rather than Lovable branding. Verified links on home, cart, Kitchen and sign-in plus all served image sizes.
- [x] Confirm https://www.scentlyn.co.ke/favicon.ico already serves the uploaded logo: its 48x48 ICO is byte-identical to the regenerated file. New versioned links and remaining icon files still require Vercel redeployment.

## Consistent product-card navigation
- [x] Diagnose Kitchen's differing action: the shared card offered direct cart addition only when no variants existed; remove that branch and link the whole card to the product page everywhere without changing styling.
- [x] Audit Kitchen variant records: both requested products have no variants and zero product-level stock; report findings without inventing stock or changing catalogue data.
- [x] Verify shared whole-card links in Kitchen, Laundry, Bathroom, All products and homepage; Fragrance has no published cards. Both Kitchen buttons and price areas open their product pages, product-page additions read back in cart, mobile has no overflow, six existing tests pass and build is OK; recommendations reuse the same component.

## Stable first-load content
- [x] Ensure shared navigation and catalogue data are server-rendered, use five-minute public query freshness, and remove post-paint product scrolling; intent preload already enabled, cart storage already effect-only, no first-load opacity reveal found.
- [x] Verify first-load visibility, fixed loading space, and cache reuse at 390/1280px; JavaScript-disabled HTML includes content, no disappear/reappear observed, no revisit reads, delayed navigation shows fixed skeleton, 17 tests pass.

## Form accessibility
- [x] Add unique field IDs/names and matching labels across storefront and admin, including generated native controls.
- [x] Verify checkout autofill and form controls in the browser without placing an order; storefront, cart and sign-in have no missing labels or duplicate IDs. Admin authenticated verification unavailable with external Supabase.

## Site speed
- [x] Diagnose first-visit loading dependencies without further photo reduction: remove repeat product reads within the existing freshness window, separate recommendations, slim shared navigation reads, and self-host fonts; database catalogue reads average 2.21ms
- [x] Verify cold mobile browsing and product/cart/delivery flow at 390/1280px; product controls open in 0.22/0.17s with background reads delayed 6s, cart persists, 19 tests pass
- [ ] Confirm customer-wide improvement after publishing/redeploying (only six homepage vital readings, no custom-domain visitor telemetry available)
- [x] Prevent footer-first loading with reserved page space and a pending skeleton; verified delayed navigation and homepage return at 1280, 766, and 390px without runtime errors
- [x] Measure visitor timings and reproduce homepage loading (only five homepage readings; insufficient for a reliable visitor-wide speed verdict)
- [x] Reduce homepage catalogue work, photo download sizes, and repeat requests (bundled photos/icon reduced; SSR Query hydration eliminates initial client catalogue requests)
- [x] Verify browsing and cart on desktop and mobile (real catalogue, cart reload, checkout delivery form; no runtime errors)

## Security hardening
- [x] Protect guest order status, payment retries, and receipt submissions with browser-bound authorization
- [x] Reject forged payment callbacks and prevent payment replays from changing fulfilled orders
- [x] Restrict customer insertion and unpublished catalogue data; retire public payment diagnostics
- [x] Patch vulnerable dependencies and verify checkout plus attacker-denial paths (16 tests; successful COD order, outsider reads/retries/receipt writes denied; test order removed and stock restored)
- [ ] Review deep scan results when the background scan completes (awaiting scanner notification)
- [ ] Enable leaked-password protection in the external Supabase project and change the previously shared admin password (requires owner action)
- [ ] Verify live Pesapal payment and return on Vercel after redeployment (requires deployment and a real payment)

- [x] Route new M-Pesa payments and retries through Pesapal, retaining saved orders; verified Pesapal opens with M-Pesa available (no payment submitted)

- [x] Show the main product's base price as the primary catalogue price; keep each variant price visible as its own option price
- [x] Save checkout orders and stock changes atomically, and retain a retry path when online payment cannot start
- [x] Reuse the same saved checkout attempt after a delayed response to prevent duplicate orders
- [x] Store Pesapal Consumer Key, Consumer Secret, and IPN ID securely; keep payment mode in sandbox
- [ ] Verify a complete sandbox payment and IPN callback; no test transaction has been submitted

- [x] Products can belong to more than one category (extra_category_ids + admin tick boxes + storefront filters)
- [x] Default variant is the first one set in admin; cards show "From Ksh X"; prices match the selected size
- [x] "Continue shopping" returns to the last browsed shop page, falling back to All products
- [x] Categories fully managed in Admin → Categories (add, rename, slug, image, reorder, hide, delete, product types) and DB-driven everywhere

- [ ] Rest of item 4 and item 5 from the uploaded brief (text was cut off — waiting on the client)
- [x] Restore a scent-story image beneath Favourites
- [x] Rename the Toiletries category to Bathroom across the storefront
- [x] Remove the gold mark and strengthen the Scentlyn wordmark
- [x] Remove free-delivery-from-KSh-3,000 messaging
- [x] Confirm location-based delivery fees update checkout totals automatically
- [x] Replace the kitchen category image with cleaning products
- [x] Replace the hero with a warm, lived-in home image
- [x] Apply the exact hero, trust, scent-story, and opening-hours copy
- [x] Make Favourites horizontally swipeable on mobile
- [x] Replace hidden horizontal product-type scrolling with a clear mobile dropdown
- [x] Merge Laundry Capsules into Laundry Pods

# Scentlyn storefront
- [x] Live catalogue and settings reads
- [x] Persistent cart and shared storefront shell
- [x] Homepage and category pages
- [x] Product detail and cart pages
- [x] Checkout and payment status pages
- [x] Metadata, responsive preview, and final validation

## Admin dashboard
- [x] Staff sign-in + one-time "claim first admin"
- [x] Overview, Orders (status + mark paid), Products (variants, photo upload, archive), Customers
- [x] Settings: homepage, categories, delivery zones, store info (live on storefront)
- [ ] Owner creates account at /auth and claims admin (needs the client)
