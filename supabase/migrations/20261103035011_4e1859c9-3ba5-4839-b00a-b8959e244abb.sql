-- 1) Products can appear in extra categories besides their main one
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS extra_category_ids uuid[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS products_extra_category_ids_gin ON public.products USING GIN (extra_category_ids);

-- 2) Categories can be hidden or shown on the storefront
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
DROP POLICY IF EXISTS "categories public read" ON public.categories;
CREATE POLICY "categories public read active" ON public.categories FOR SELECT TO anon, authenticated USING (is_active = true);

-- 3) Variants keep the order the owner sets in admin
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
WITH ordered AS (
  SELECT id, (row_number() OVER (PARTITION BY product_id ORDER BY created_at, id) - 1) AS rn
  FROM public.product_variants
)
UPDATE public.product_variants v SET display_order = o.rn FROM ordered o WHERE v.id = o.id;

-- 4) Admin-managed product types per category (Shop-by-type filter source)
CREATE TABLE IF NOT EXISTS public.product_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);
GRANT SELECT ON public.product_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_types TO authenticated;
GRANT ALL ON public.product_types TO service_role;
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product types public read" ON public.product_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "product types admin write" ON public.product_types FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_product_types_updated_at BEFORE UPDATE ON public.product_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the laundry types the storefront already shows
INSERT INTO public.product_types (category_id, name, display_order)
SELECT c.id, t.name, t.ord
FROM public.categories c
CROSS JOIN (VALUES
  ('Laundry Pods', 0), ('Scent Boosters', 1), ('Stain Removers', 2),
  ('Machine Care', 3), ('Colour Catchers', 4), ('Fabric Softeners', 5), ('Laundry Accessories', 6)
) AS t(name, ord)
WHERE c.slug = 'laundry'
ON CONFLICT (category_id, name) DO NOTHING;
