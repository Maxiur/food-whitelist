-- Preapprove exact email addresses privately. Email verification grants access
-- automatically; there is no first-user-wins or client-controlled approval.
BEGIN;
CREATE TABLE IF NOT EXISTS app_private.approved_email (
  account_role text PRIMARY KEY CHECK (account_role IN ('owner', 'member')),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND position('@' IN email) > 1)
);
REVOKE ALL ON app_private.approved_email FROM PUBLIC, anonymous, authenticated;
ALTER TABLE app_private.approved_email ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_private.notebook_owner_id()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  WITH resolved_owner AS (
    -- Explicit identity bindings retain priority for existing installations.
    SELECT coalesce(
      (SELECT user_id FROM app_private.allowed_owner WHERE singleton = 1),
      (SELECT u.id::text FROM neon_auth."user" AS u
       JOIN app_private.approved_email AS approved ON lower(u.email) = approved.email
       WHERE approved.account_role = 'owner' AND u."emailVerified" = true
         AND coalesce(u.banned, false) = false)
    ) AS id
  )
  SELECT owner.id FROM resolved_owner AS owner
  WHERE owner.id IS NOT NULL AND (
    owner.id = app_private.current_user_id()
    OR EXISTS (SELECT 1 FROM app_private.notebook_member AS member
      WHERE member.user_id = app_private.current_user_id())
    OR EXISTS (SELECT 1 FROM neon_auth."user" AS u
      JOIN app_private.approved_email AS approved ON lower(u.email) = approved.email
      WHERE approved.account_role = 'member' AND u.id::text = app_private.current_user_id()
        AND u."emailVerified" = true AND coalesce(u.banned, false) = false)
  );
$function$;
REVOKE ALL ON FUNCTION app_private.notebook_owner_id() FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION app_private.notebook_owner_id() TO authenticated;
COMMIT;
