# Current storefront refinements

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
