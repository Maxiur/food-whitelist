-- Manual setup only: run after both users have signed in and their verified
-- identities have been checked in Neon Auth. Never commit populated IDs.
DO $bootstrap$
DECLARE
  chosen_member text := 'REPLACE_WITH_VERIFIED_COLLABORATOR_USER_ID';
  existing_member text;
  owner_id text;
BEGIN
  IF chosen_member = 'REPLACE_WITH_VERIFIED_COLLABORATOR_USER_ID' OR btrim(chosen_member) = '' THEN
    RAISE EXCEPTION 'Replace the placeholder with the verified collaborator user ID.';
  END IF;
  SELECT user_id INTO owner_id FROM app_private.allowed_owner WHERE singleton = 1;
  IF owner_id IS NULL OR owner_id = chosen_member THEN
    RAISE EXCEPTION 'Set up a distinct notebook owner first.';
  END IF;
  SELECT user_id INTO existing_member FROM app_private.notebook_member WHERE singleton = 1;
  IF existing_member IS NOT NULL AND existing_member <> chosen_member THEN
    RAISE EXCEPTION 'A collaborator already exists. Review access before replacing it.';
  END IF;
  INSERT INTO app_private.notebook_member(user_id) VALUES (chosen_member)
  ON CONFLICT DO NOTHING;
END;
$bootstrap$;
