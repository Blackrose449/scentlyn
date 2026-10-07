UPDATE public.products
SET subcategory = 'Laundry Pods', updated_at = now()
WHERE subcategory = 'Laundry Capsules'
  AND category_id = (SELECT id FROM public.categories WHERE slug = 'laundry' LIMIT 1);