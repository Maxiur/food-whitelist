-- Keep one notebook owner and allow one explicitly approved collaborator.
-- Existing entries keep their owner_id and remain in the same notebook.
BEGIN;
CREATE TABLE IF NOT EXISTS app_private.notebook_member (
  user_id text PRIMARY KEY CHECK (length(user_id) > 0),
  singleton smallint NOT NULL UNIQUE DEFAULT 1 CHECK (singleton = 1)
    REFERENCES app_private.allowed_owner(singleton)
);
REVOKE ALL ON app_private.notebook_member FROM PUBLIC, anonymous, authenticated;
ALTER TABLE app_private.notebook_member ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_private.notebook_owner_id()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT owner.user_id FROM app_private.allowed_owner AS owner
  WHERE owner.singleton = 1 AND (
    owner.user_id = app_private.current_user_id()
    OR EXISTS (SELECT 1 FROM app_private.notebook_member AS member
      WHERE member.singleton = owner.singleton AND member.user_id = app_private.current_user_id())
  );
$function$;
REVOKE ALL ON FUNCTION app_private.notebook_owner_id() FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION app_private.notebook_owner_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_notebook_owner_id()
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog
AS $function$ SELECT app_private.notebook_owner_id(); $function$;
REVOKE ALL ON FUNCTION public.get_notebook_owner_id() FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION public.get_notebook_owner_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_notebook_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog
AS $function$ SELECT app_private.notebook_owner_id() IS NOT NULL; $function$;

ALTER TABLE public.food_preferences ALTER COLUMN owner_id SET DEFAULT app_private.notebook_owner_id();
ALTER POLICY food_select_owner ON public.food_preferences
  USING (owner_id = (SELECT app_private.notebook_owner_id()));
ALTER POLICY food_insert_owner ON public.food_preferences
  WITH CHECK (owner_id = (SELECT app_private.notebook_owner_id()));
ALTER POLICY food_update_owner ON public.food_preferences
  USING (owner_id = (SELECT app_private.notebook_owner_id()))
  WITH CHECK (owner_id = (SELECT app_private.notebook_owner_id()));
ALTER POLICY food_delete_owner ON public.food_preferences
  USING (owner_id = (SELECT app_private.notebook_owner_id()));
COMMENT ON TABLE public.food_preferences IS 'Private shared notebook. Approved owner and collaborator only; no anonymous access.';
COMMIT;
