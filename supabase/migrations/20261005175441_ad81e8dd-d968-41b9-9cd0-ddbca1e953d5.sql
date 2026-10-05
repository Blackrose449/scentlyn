INSERT INTO public.site_settings (key, value)
VALUES (
  'trust_badges',
  '["Premium brands", "Fast & reliable delivery", "Secure payments", "Support when you need us"]'::jsonb
)
ON CONFLICT (key)
DO UPDATE SET value = EXCLUDED.value, updated_at = now();