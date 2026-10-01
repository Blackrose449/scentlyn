-- Product archiving + base stock for the admin product form
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;

-- Archived products disappear from the storefront
DROP POLICY IF EXISTS "products public read active" ON public.products;
CREATE POLICY "products public read active" ON public.products
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND archived_at IS NULL);

-- Admins need to call is_admin() from app code
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- One-time "claim first admin": only succeeds while no admin exists
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT count(*) INTO existing FROM public.admin_users;
  IF existing > 0 THEN
    RETURN EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = uid);
  END IF;
  INSERT INTO public.admin_users (user_id, email)
  SELECT uid, u.email FROM auth.users u WHERE u.id = uid
  ON CONFLICT (user_id) DO NOTHING;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- Tells a signed-in user whether an admin already exists (no data exposed)
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_users) $$;

REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated;

-- Admins manage the admin list
DROP POLICY IF EXISTS "admins manage admin list" ON public.admin_users;
CREATE POLICY "admins manage admin list" ON public.admin_users
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO authenticated;