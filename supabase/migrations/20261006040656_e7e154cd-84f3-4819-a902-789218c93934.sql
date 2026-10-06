UPDATE public.categories
SET name = 'Bathroom'
WHERE slug = 'toiletries';

INSERT INTO public.site_settings (key, value)
VALUES ('store_hours', to_jsonb('Mon to Sat, 8:30pm to 7:30pm'::text))
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;