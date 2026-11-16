-- Private deployment configuration, not an automatic migration.
-- Replace placeholders in a private copy; never commit real email addresses.
-- Use 'member' to preapprove the second account before its first sign-in.
DO $approve$
DECLARE chosen_role text := 'owner'; chosen_email text := 'REPLACE_WITH_APPROVED_EMAIL';
BEGIN
  IF chosen_email = 'REPLACE_WITH_APPROVED_EMAIL' THEN
    RAISE EXCEPTION 'Set the intended email address first.';
  END IF;
  INSERT INTO app_private.approved_email(account_role, email)
    VALUES (chosen_role, lower(btrim(chosen_email)));
  -- An existing role/email causes a conflict instead of silently changing access.
END;
$approve$;
