INSERT INTO public.site_settings (key, value)
VALUES
  ('hero_headline', '"AS GOOD AS THEY LOOK."'::jsonb),
  ('hero_subtext', '"A beautiful home begins with how it feels."'::jsonb),
  ('hero_eyebrow', '"FOR HOMES THAT FEEL"'::jsonb),
  ('trust_badges', '["Genuine Brands", "Delivery Across Kenya", "Secure Payments", "Quality You Can Trust"]'::jsonb),
  ('store_hours', '"8:30am–7:30pm"'::jsonb)
ON CONFLICT (key)
DO UPDATE SET value = EXCLUDED.value, updated_at = now();