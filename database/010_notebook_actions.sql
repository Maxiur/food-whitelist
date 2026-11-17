-- Small notebook actions and owner-managed collaborator approval.
BEGIN;
ALTER TABLE public.food_preferences
  ADD COLUMN pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN deleted_at timestamptz;
GRANT UPDATE (pinned) ON public.food_preferences TO authenticated;
ALTER POLICY food_select_owner ON public.food_preferences
  USING (owner_id = (SELECT app_private.notebook_owner_id()) AND deleted_at IS NULL);
ALTER POLICY food_update_owner ON public.food_preferences
  USING (owner_id = (SELECT app_private.notebook_owner_id()) AND deleted_at IS NULL)
  WITH CHECK (owner_id = (SELECT app_private.notebook_owner_id()) AND deleted_at IS NULL);

-- Definer routines check notebook access explicitly; callers cannot set deletion timestamps.
CREATE FUNCTION public.remove_food_entry(entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  UPDATE public.food_preferences SET deleted_at = clock_timestamp()
    WHERE id = entry_id AND owner_id = app_private.notebook_owner_id() AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entry unavailable' USING ERRCODE = 'P0002'; END IF;
END;
$$;
CREATE FUNCTION public.restore_food_entry(entry_id uuid)
RETURNS SETOF public.food_preferences LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  RETURN QUERY UPDATE public.food_preferences SET deleted_at = NULL
    WHERE id = entry_id AND owner_id = app_private.notebook_owner_id()
      AND deleted_at >= clock_timestamp() - interval '60 seconds'
    RETURNING *;
  IF NOT FOUND THEN RAISE EXCEPTION 'Restore window expired or entry unavailable' USING ERRCODE = 'P0002'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.remove_food_entry(uuid), public.restore_food_entry(uuid) FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION public.remove_food_entry(uuid), public.restore_food_entry(uuid) TO authenticated;

CREATE FUNCTION app_private.require_notebook_owner()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF app_private.notebook_owner_id() IS NULL
    OR app_private.notebook_owner_id() IS DISTINCT FROM app_private.current_user_id() THEN
    RAISE EXCEPTION 'Owner access required' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION app_private.require_notebook_owner() FROM PUBLIC, anonymous, authenticated;

CREATE FUNCTION public.get_notebook_sharing()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE member_email text;
BEGIN
  IF app_private.notebook_owner_id() IS NULL THEN
    RAISE EXCEPTION 'Notebook access required' USING ERRCODE = '42501';
  END IF;
  IF app_private.notebook_owner_id() IS DISTINCT FROM app_private.current_user_id() THEN
    RETURN jsonb_build_object('role', 'member');
  END IF;
  SELECT email INTO member_email FROM app_private.approved_email WHERE account_role = 'member';
  RETURN jsonb_build_object('role', 'owner', 'email', member_email,
    'legacyMember', EXISTS (SELECT 1 FROM app_private.notebook_member),
    'status', CASE WHEN member_email IS NULL THEN 'empty'
      WHEN EXISTS (SELECT 1 FROM neon_auth."user" WHERE lower(email) = member_email
        AND "emailVerified" AND NOT coalesce(banned, false)) THEN 'active' ELSE 'pending' END);
END;
$$;
CREATE FUNCTION public.invite_notebook_member(member_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE normalized_email text := lower(btrim(member_email)); existing_email text;
BEGIN
  PERFORM app_private.require_notebook_owner();
  -- Serialize the single collaborator slot, including simultaneous requests from two devices.
  PERFORM pg_advisory_xact_lock(104018, 1);
  IF normalized_email IS NULL OR char_length(normalized_email) > 254
    OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Invalid email' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM neon_auth."user" WHERE id::text = app_private.current_user_id()
    AND lower(email) = normalized_email) THEN
    RAISE EXCEPTION 'Cannot invite notebook owner' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM app_private.notebook_member) THEN
    RAISE EXCEPTION 'A legacy collaborator is configured' USING ERRCODE = '23505';
  END IF;
  SELECT email INTO existing_email FROM app_private.approved_email WHERE account_role = 'member';
  IF existing_email IS NOT NULL AND existing_email <> normalized_email THEN
    RAISE EXCEPTION 'Collaborator slot is occupied' USING ERRCODE = '23505';
  END IF;
  INSERT INTO app_private.approved_email(account_role, email) VALUES ('member', normalized_email)
    ON CONFLICT (account_role) DO NOTHING;
END;
$$;
CREATE FUNCTION public.revoke_notebook_member(expected_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  PERFORM app_private.require_notebook_owner();
  PERFORM pg_advisory_xact_lock(104018, 1);
  DELETE FROM app_private.approved_email WHERE account_role = 'member' AND email = lower(btrim(expected_email));
  IF NOT FOUND THEN RAISE EXCEPTION 'Collaborator changed; refresh first' USING ERRCODE = 'P0002'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.get_notebook_sharing(), public.invite_notebook_member(text), public.revoke_notebook_member(text) FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION public.get_notebook_sharing(), public.invite_notebook_member(text), public.revoke_notebook_member(text) TO authenticated;
COMMIT;
