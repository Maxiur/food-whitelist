-- Execute as the database owner on an isolated Neon TEST BRANCH after migration.
-- Uses synthetic identities and rows. All changes are rolled back.
-- This checks PostgreSQL GRANT/RLS, not end-to-end JWT verification by the API.
-- Direct (non-pooled) connection; stop on the first error.
BEGIN;

-- Confirm that a missing request identity is represented as NULL.
SELECT app_private.current_user_id();
INSERT INTO app_private.allowed_owner (singleton, user_id)
VALUES (1, '__food_whitelist_privacy_test_owner__')
ON CONFLICT (singleton) DO UPDATE SET user_id = EXCLUDED.user_id;
INSERT INTO app_private.notebook_member (singleton, user_id)
VALUES (1, '__food_whitelist_privacy_test_member__')
ON CONFLICT (singleton) DO UPDATE SET user_id = EXCLUDED.user_id;

SET LOCAL request.jwt.claims = '{"sub":"__food_whitelist_privacy_test_owner__","role":"authenticated"}';
SET LOCAL ROLE authenticated;
DO $owner$
DECLARE entry_id uuid; affected integer;
BEGIN
  IF app_private.current_user_id() IS DISTINCT FROM '__food_whitelist_privacy_test_owner__' THEN
    RAISE EXCEPTION 'Claims simulation unavailable; do not treat this as a passing privacy test.';
  END IF;
  INSERT INTO public.food_preferences (name, preference, category, notes)
    VALUES ('__privacy_test__', 'like', 'Other', 'Synthetic test only') RETURNING id INTO entry_id;
  IF NOT EXISTS (SELECT 1 FROM public.food_preferences WHERE id = entry_id) THEN
    RAISE EXCEPTION 'Owner cannot read inserted row';
  END IF;
  UPDATE public.food_preferences SET notes = 'Changed' WHERE id = entry_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Owner cannot update row'; END IF;
  BEGIN
    UPDATE public.food_preferences SET owner_id = '__different_owner__' WHERE id = entry_id;
    RAISE EXCEPTION 'FAIL: owner_id could be changed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.food_preferences (owner_id, name, preference, category)
      VALUES ('__different_owner__', 'forged owner', 'like', 'Other');
    RAISE EXCEPTION 'FAIL: forged owner insert succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$owner$;
RESET ROLE;

SET LOCAL request.jwt.claims = '{"sub":"__food_whitelist_privacy_test_member__","role":"authenticated"}';
SET LOCAL ROLE authenticated;
DO $member$
DECLARE entry_id uuid; affected integer;
BEGIN
  IF public.get_notebook_owner_id() IS DISTINCT FROM '__food_whitelist_privacy_test_owner__' THEN
    RAISE EXCEPTION 'Member did not resolve the shared notebook';
  END IF;
  UPDATE public.food_preferences SET notes = 'Shared edit' WHERE name = '__privacy_test__';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Member cannot edit owner entries'; END IF;
  INSERT INTO public.food_preferences (name, preference, category)
    VALUES ('__shared_ingredient_test__', 'like', 'Meat') RETURNING id INTO entry_id;
  IF NOT EXISTS (SELECT 1 FROM public.food_preferences WHERE id = entry_id AND owner_id = '__food_whitelist_privacy_test_owner__') THEN
    RAISE EXCEPTION 'Member insert was not assigned to the shared notebook';
  END IF;
  DELETE FROM public.food_preferences WHERE id = entry_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Member cannot delete'; END IF;
  BEGIN
    INSERT INTO public.food_preferences(owner_id, name, preference, category)
      VALUES ('__food_whitelist_privacy_test_member__', 'Spoof', 'like', 'Meat');
    RAISE EXCEPTION 'FAIL: member can write outside the shared notebook';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO app_private.notebook_member(user_id) VALUES ('__attacker__');
    RAISE EXCEPTION 'FAIL: member can grant access';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$member$;
RESET ROLE;

SET LOCAL request.jwt.claims = '{"sub":"__food_whitelist_privacy_test_stranger__","role":"authenticated"}';
SET LOCAL ROLE authenticated;
DO $stranger$
DECLARE affected integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.food_preferences) THEN
    RAISE EXCEPTION 'FAIL: another user can read notebook rows';
  END IF;
  BEGIN
    INSERT INTO public.food_preferences (name, preference, category)
      VALUES ('stranger row', 'like', 'Other');
    RAISE EXCEPTION 'FAIL: unapproved account can create notebook rows';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.food_preferences SET notes = 'Unauthorized';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: another user can update notebook rows'; END IF;
  DELETE FROM public.food_preferences;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: another user can delete notebook rows'; END IF;
  BEGIN
    INSERT INTO app_private.allowed_owner (singleton, user_id) VALUES (1, '__attacker__');
    RAISE EXCEPTION 'FAIL: allowlist is writable by an authenticated user';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$stranger$;
RESET ROLE;

SET LOCAL request.jwt.claims = '{}';
SET LOCAL ROLE anonymous;
DO $anonymous$
BEGIN
  BEGIN
    PERFORM 1 FROM public.food_preferences;
    RAISE EXCEPTION 'FAIL: anonymous can SELECT';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.food_preferences (name, preference, category) VALUES ('anonymous', 'like', 'Other');
    RAISE EXCEPTION 'FAIL: anonymous can INSERT';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.food_preferences SET notes = 'Anonymous';
    RAISE EXCEPTION 'FAIL: anonymous can UPDATE';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.food_preferences;
    RAISE EXCEPTION 'FAIL: anonymous can DELETE';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$anonymous$;
RESET ROLE;

SET LOCAL request.jwt.claims = '{"sub":"__food_whitelist_privacy_test_owner__","role":"authenticated"}';
SET LOCAL ROLE authenticated;
DO $owner_delete$
DECLARE affected integer;
BEGIN
  DELETE FROM public.food_preferences WHERE name = '__privacy_test__';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Owner cannot delete test row'; END IF;
END;
$owner_delete$;
RESET ROLE;
ROLLBACK;
SELECT 'Privacy checks passed; synthetic changes rolled back.' AS result;
