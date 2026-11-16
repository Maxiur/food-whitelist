-- Isolated test branch only. Synthetic identities, rolled back at the end.
BEGIN;
DO $empty$
BEGIN
  IF EXISTS (SELECT 1 FROM app_private.allowed_owner) OR EXISTS (SELECT 1 FROM app_private.approved_email) THEN
    RAISE EXCEPTION 'Use an unconfigured test branch for this test.';
  END IF;
END;
$empty$;
INSERT INTO app_private.approved_email(account_role, email) VALUES
  ('owner', 'owner-test@example.invalid'), ('member', 'member-test@example.invalid');
INSERT INTO neon_auth."user" (id, name, email, "emailVerified") VALUES
  ('0c466fe5-85c0-41ab-8db5-652d57c7f301', 'Synthetic owner', 'owner-test@example.invalid', false),
  ('0c466fe5-85c0-41ab-8db5-652d57c7f302', 'Synthetic member', 'member-test@example.invalid', false);

SET LOCAL request.jwt.claims = '{"sub":"0c466fe5-85c0-41ab-8db5-652d57c7f301"}';
SET LOCAL ROLE authenticated;
DO $unverified$
BEGIN
  IF public.get_notebook_owner_id() IS NOT NULL THEN RAISE EXCEPTION 'Unverified owner got access'; END IF;
END;
$unverified$;
RESET ROLE;
UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = '0c466fe5-85c0-41ab-8db5-652d57c7f301';
SET LOCAL ROLE authenticated;
DO $owner$
BEGIN
  IF public.get_notebook_owner_id() IS DISTINCT FROM '0c466fe5-85c0-41ab-8db5-652d57c7f301' THEN
    RAISE EXCEPTION 'Verified owner not activated automatically';
  END IF;
  INSERT INTO public.food_preferences(name, preference, category) VALUES ('__email_access_test__', 'like', 'Meat');
  IF NOT EXISTS (SELECT 1 FROM public.food_preferences WHERE name = '__email_access_test__') THEN
    RAISE EXCEPTION 'Verified owner cannot read its entry';
  END IF;
  BEGIN
    INSERT INTO app_private.approved_email(account_role, email) VALUES ('member', 'attacker@example.invalid');
    RAISE EXCEPTION 'Authenticated caller can grant access';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$owner$;
RESET ROLE;

SET LOCAL request.jwt.claims = '{"sub":"0c466fe5-85c0-41ab-8db5-652d57c7f302"}';
SET LOCAL ROLE authenticated;
DO $unverified_member$
BEGIN
  IF public.get_notebook_owner_id() IS NOT NULL THEN RAISE EXCEPTION 'Unverified member got access'; END IF;
END;
$unverified_member$;
RESET ROLE;
UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = '0c466fe5-85c0-41ab-8db5-652d57c7f302';
SET LOCAL ROLE authenticated;
DO $member$
BEGIN
  IF public.get_notebook_owner_id() IS DISTINCT FROM '0c466fe5-85c0-41ab-8db5-652d57c7f301' THEN
    RAISE EXCEPTION 'Verified member not activated automatically';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.food_preferences WHERE name = '__email_access_test__') THEN
    RAISE EXCEPTION 'Member cannot read the shared entry';
  END IF;
END;
$member$;
RESET ROLE;

SET LOCAL request.jwt.claims = '{"sub":"uninvited-user","email":"owner-test@example.invalid","email_verified":true}';
SET LOCAL ROLE authenticated;
DO $stranger$
BEGIN
  IF public.get_notebook_owner_id() IS NOT NULL OR EXISTS(SELECT 1 FROM public.food_preferences) THEN
    RAISE EXCEPTION 'Uninvited user got access through an email claim';
  END IF;
END;
$stranger$;
RESET ROLE;
SET LOCAL request.jwt.claims = '{}';
SET LOCAL ROLE anonymous;
DO $anonymous$
BEGIN
  BEGIN
    PERFORM public.get_notebook_owner_id();
    RAISE EXCEPTION 'Anonymous can resolve the notebook';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$anonymous$;
RESET ROLE;
ROLLBACK;
SELECT 'Verified email access checks passed; changes rolled back.' AS result;
