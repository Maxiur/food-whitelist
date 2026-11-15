-- Food Whitelist: run as the database owner AFTER enabling Neon Auth and the Data API.
-- This migration grants no anonymous access. An empty owner allowlist denies everyone.
-- Data API must expose only the public schema, never app_private or neon_auth.
BEGIN;

DO $check$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous')
 THEN
    RAISE EXCEPTION 'Enable Neon Auth and Data API before applying this migration.';
  END IF;
END
$check$;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anonymous, authenticated;

-- PostgREST sets transaction-scoped claims only after verifying the JWT.
-- Missing identity returns NULL and every policy denies access.
CREATE OR REPLACE FUNCTION app_private.current_user_id()
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '');
$function$;
REVOKE ALL ON FUNCTION app_private.current_user_id() FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION app_private.current_user_id() TO authenticated;


-- At most one notebook owner. The browser can neither read nor modify this table.
CREATE TABLE IF NOT EXISTS app_private.allowed_owner (
  singleton smallint PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  user_id text NOT NULL UNIQUE CHECK (length(user_id) > 0)
);
REVOKE ALL ON app_private.allowed_owner FROM PUBLIC, anonymous, authenticated;
ALTER TABLE app_private.allowed_owner ENABLE ROW LEVEL SECURITY;

-- The identity is evaluated by app_private.current_user_id() in each RLS policy, outside this
-- SECURITY DEFINER function. This function only checks a private allowlist.
CREATE OR REPLACE FUNCTION app_private.is_allowed_owner(candidate_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT candidate_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM app_private.allowed_owner AS allowed
    WHERE allowed.singleton = 1 AND allowed.user_id = candidate_id
  );
$function$;
REVOKE ALL ON FUNCTION app_private.is_allowed_owner(text) FROM PUBLIC, anonymous, authenticated;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_allowed_owner(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.food_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL DEFAULT app_private.current_user_id(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  preference text NOT NULL CHECK (preference IN ('like', 'dislike')),
  category text NOT NULL DEFAULT 'Other'
    CHECK (category IN ('Vegetables', 'Fruit', 'Meals', 'Desserts', 'Drinks', 'Snacks', 'Other')),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.food_preferences ALTER COLUMN owner_id SET DEFAULT app_private.current_user_id();
CREATE INDEX IF NOT EXISTS food_preferences_owner_created_idx
  ON public.food_preferences (owner_id, created_at DESC, id);

CREATE OR REPLACE FUNCTION app_private.touch_food_preference()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION app_private.touch_food_preference() FROM PUBLIC, anonymous, authenticated;
DROP TRIGGER IF EXISTS food_preferences_updated_at ON public.food_preferences;
CREATE TRIGGER food_preferences_updated_at
  BEFORE UPDATE ON public.food_preferences
  FOR EACH ROW EXECUTE FUNCTION app_private.touch_food_preference();

ALTER TABLE public.food_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_preferences FORCE ROW LEVEL SECURITY;

-- Reset this app's policies on reruns. Never add a permissive public policy.
DROP POLICY IF EXISTS food_select_owner ON public.food_preferences;
DROP POLICY IF EXISTS food_insert_owner ON public.food_preferences;
DROP POLICY IF EXISTS food_update_owner ON public.food_preferences;
DROP POLICY IF EXISTS food_delete_owner ON public.food_preferences;

CREATE POLICY food_select_owner ON public.food_preferences FOR SELECT TO authenticated
USING (owner_id = (SELECT app_private.current_user_id()) AND app_private.is_allowed_owner((SELECT app_private.current_user_id())));
CREATE POLICY food_insert_owner ON public.food_preferences FOR INSERT TO authenticated
WITH CHECK (owner_id = (SELECT app_private.current_user_id()) AND app_private.is_allowed_owner((SELECT app_private.current_user_id())));
CREATE POLICY food_update_owner ON public.food_preferences FOR UPDATE TO authenticated
USING (owner_id = (SELECT app_private.current_user_id()) AND app_private.is_allowed_owner((SELECT app_private.current_user_id())))
WITH CHECK (owner_id = (SELECT app_private.current_user_id()) AND app_private.is_allowed_owner((SELECT app_private.current_user_id())));
CREATE POLICY food_delete_owner ON public.food_preferences FOR DELETE TO authenticated
USING (owner_id = (SELECT app_private.current_user_id()) AND app_private.is_allowed_owner((SELECT app_private.current_user_id())));

REVOKE ALL ON public.food_preferences FROM PUBLIC, anonymous, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, DELETE ON public.food_preferences TO authenticated;
GRANT INSERT (owner_id, name, preference, category, notes) ON public.food_preferences TO authenticated;
GRANT UPDATE (name, preference, category, notes) ON public.food_preferences TO authenticated;

COMMENT ON TABLE public.food_preferences IS 'Private food notebook. Authenticated allowlisted owner only; no anonymous access.';
-- Exposes only whether the current signed-in identity is the approved owner.
CREATE OR REPLACE FUNCTION public.has_notebook_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT app_private.is_allowed_owner(app_private.current_user_id());
$function$;
REVOKE ALL ON FUNCTION public.has_notebook_access() FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION public.has_notebook_access() TO authenticated;
COMMIT;
