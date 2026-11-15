-- Run once as the database owner after creating your own account in Neon Auth.
-- Copy the exact account ID from Neon Auth's Users view. Never guess from email.
-- This file is intentionally NOT an automatic migration.
-- Do not replace an existing owner without checking ownership of existing rows.
DO $bootstrap$
DECLARE
  chosen_owner text := 'REPLACE_WITH_YOUR_NEON_AUTH_USER_ID';
  existing_owner text;
BEGIN
  IF chosen_owner = 'REPLACE_WITH_YOUR_NEON_AUTH_USER_ID' OR btrim(chosen_owner) = '' THEN
    RAISE EXCEPTION 'Replace the placeholder with your exact Neon Auth user ID first.';
  END IF;
  SELECT user_id INTO existing_owner FROM app_private.allowed_owner WHERE singleton = 1;
  IF existing_owner IS NOT NULL AND existing_owner <> chosen_owner THEN
    RAISE EXCEPTION 'An owner already exists. Review existing data before changing ownership.';
  END IF;
  INSERT INTO app_private.allowed_owner (singleton, user_id)
  VALUES (1, chosen_owner)
  ON CONFLICT (singleton) DO NOTHING;
END;
$bootstrap$;
