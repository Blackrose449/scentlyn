
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, service_role;
