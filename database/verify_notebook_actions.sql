-- Run only on an isolated branch. All synthetic changes are rolled back.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM app_private.approved_email) OR EXISTS (SELECT 1 FROM app_private.allowed_owner) THEN
    RAISE EXCEPTION 'Use an unconfigured test branch';
  END IF;
END; $$;
INSERT INTO app_private.approved_email(account_role,email) VALUES('owner','actions-owner@example.invalid');
INSERT INTO neon_auth."user"(id,name,email,"emailVerified") VALUES
 ('0c466fe5-85c0-41ab-8db5-652d57c7f311','Test owner','actions-owner@example.invalid',true),
 ('0c466fe5-85c0-41ab-8db5-652d57c7f312','Test member','actions-member@example.invalid',false),
 ('0c466fe5-85c0-41ab-8db5-652d57c7f313','Test stranger','actions-stranger@example.invalid',true);
SET LOCAL request.jwt.claims = '{"sub":"0c466fe5-85c0-41ab-8db5-652d57c7f311"}';
SET LOCAL ROLE authenticated;
DO $$ DECLARE item_id uuid; restored public.food_preferences; BEGIN
  PERFORM public.invite_notebook_member(' Actions-Member@example.invalid ');
  IF public.get_notebook_sharing()->>'status' <> 'pending' THEN RAISE EXCEPTION 'Invitation missing'; END IF;
  BEGIN PERFORM public.invite_notebook_member('actions-stranger@example.invalid');
    RAISE EXCEPTION 'Occupied invitation replaced'; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN PERFORM public.invite_notebook_member('actions-owner@example.invalid');
    RAISE EXCEPTION 'Owner can invite self'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  INSERT INTO public.food_preferences(name,preference,category,kind,tags)
    VALUES('__actions_test__','like','Meals','dish',ARRAY['obiad']) RETURNING id INTO item_id;
  PERFORM set_config('test.entry_id', item_id::text, true);
  UPDATE public.food_preferences SET pinned=true WHERE id=item_id;
  PERFORM public.remove_food_entry(item_id);
  IF EXISTS(SELECT 1 FROM public.food_preferences WHERE id=item_id) THEN RAISE EXCEPTION 'Deleted entry visible'; END IF;
  SELECT * INTO restored FROM public.restore_food_entry(item_id);
  IF restored.id <> item_id OR NOT restored.pinned OR restored.tags <> ARRAY['obiad'] THEN RAISE EXCEPTION 'Restore lost data'; END IF;
  BEGIN UPDATE public.food_preferences SET deleted_at=now() WHERE id=item_id;
    RAISE EXCEPTION 'Caller can change restore deadline'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL request.jwt.claims = '{"sub":"0c466fe5-85c0-41ab-8db5-652d57c7f312"}';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.get_notebook_owner_id() IS NOT NULL THEN RAISE EXCEPTION 'Unverified invitee got access'; END IF;
END; $$;
RESET ROLE;
UPDATE neon_auth."user" SET "emailVerified"=true WHERE id='0c466fe5-85c0-41ab-8db5-652d57c7f312';
SET LOCAL ROLE authenticated;
DO $$ DECLARE item_id uuid; BEGIN
  IF public.get_notebook_sharing() <> '{"role":"member"}'::jsonb THEN RAISE EXCEPTION 'Member sees owner settings'; END IF;
  SELECT id INTO item_id FROM public.food_preferences WHERE name='__actions_test__';
  IF item_id IS NULL THEN RAISE EXCEPTION 'Verified invitee cannot read'; END IF;
  PERFORM public.remove_food_entry(item_id);
  PERFORM public.restore_food_entry(item_id);
  BEGIN PERFORM public.invite_notebook_member('actions-stranger@example.invalid');
    RAISE EXCEPTION 'Member can invite'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.revoke_notebook_member('actions-member@example.invalid');
    RAISE EXCEPTION 'Member can revoke'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL request.jwt.claims = '{"sub":"0c466fe5-85c0-41ab-8db5-652d57c7f313"}';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM public.get_notebook_sharing(); RAISE EXCEPTION 'Stranger sees invitation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.invite_notebook_member('actions-stranger@example.invalid'); RAISE EXCEPTION 'Stranger self-approves'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.remove_food_entry(current_setting('test.entry_id')::uuid); RAISE EXCEPTION 'Unauthorized delete accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;
  BEGIN PERFORM public.restore_food_entry(current_setting('test.entry_id')::uuid); RAISE EXCEPTION 'Unauthorized restore accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL request.jwt.claims = '{"sub":"0c466fe5-85c0-41ab-8db5-652d57c7f311"}';
SET LOCAL ROLE authenticated;
SELECT public.revoke_notebook_member('actions-member@example.invalid');
RESET ROLE;
SET LOCAL request.jwt.claims = '{"sub":"0c466fe5-85c0-41ab-8db5-652d57c7f312"}';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.get_notebook_owner_id() IS NOT NULL OR EXISTS(SELECT 1 FROM public.food_preferences) THEN
    RAISE EXCEPTION 'Revoked member still has access';
  END IF;
END; $$;
RESET ROLE;
UPDATE public.food_preferences SET deleted_at = now() - interval '61 seconds' WHERE name='__actions_test__';
SET LOCAL request.jwt.claims = '{"sub":"0c466fe5-85c0-41ab-8db5-652d57c7f311"}';
SET LOCAL ROLE authenticated;
DO $$ DECLARE item_id uuid; BEGIN
  -- The fixture id remains available even while SELECT policies hide the deleted row.
  BEGIN PERFORM public.restore_food_entry(current_setting('test.entry_id', true)::uuid);
    RAISE EXCEPTION 'Expired restore accepted'; EXCEPTION WHEN no_data_found THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL request.jwt.claims = '{}';
SET LOCAL ROLE anonymous;
DO $$ BEGIN
  BEGIN PERFORM public.get_notebook_sharing(); RAISE EXCEPTION 'Anonymous sees invitation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.invite_notebook_member('actions-stranger@example.invalid'); RAISE EXCEPTION 'Anonymous invites'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.restore_food_entry('00000000-0000-0000-0000-000000000000'); RAISE EXCEPTION 'Anonymous restores'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
ROLLBACK;
SELECT 'Notebook actions and invitation privacy checks passed' AS result;
