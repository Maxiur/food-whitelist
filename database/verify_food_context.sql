-- Isolated test branch only; synthetic changes are rolled back.
BEGIN;
INSERT INTO app_private.allowed_owner(singleton,user_id) VALUES(1,'__context_test__')
  ON CONFLICT(singleton) DO UPDATE SET user_id=EXCLUDED.user_id;
SET LOCAL request.jwt.claims = '{"sub":"__context_test__"}';
SET LOCAL ROLE authenticated;
DO $test$
DECLARE row_id uuid; result public.food_preferences;
BEGIN
  INSERT INTO public.food_preferences(name,preference,category)
    VALUES ('__context_test__','like','FishSeafood') RETURNING id INTO row_id;
  SELECT * INTO result FROM public.food_preferences WHERE id=row_id;
  IF result.kind <> 'unspecified' OR result.tags <> '{}'::text[] THEN
    RAISE EXCEPTION 'Legacy insert must remain unclassified';
  END IF;
  UPDATE public.food_preferences SET kind='dish', tags=ARRAY['śniadanie','na szybko'] WHERE id=row_id;
  SELECT * INTO result FROM public.food_preferences WHERE id=row_id;
  IF result.kind <> 'dish' OR result.tags <> ARRAY['śniadanie','na szybko'] THEN
    RAISE EXCEPTION 'Context was not persisted';
  END IF;
  BEGIN UPDATE public.food_preferences SET kind='unknown' WHERE id=row_id;
    RAISE EXCEPTION 'Invalid type accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.food_preferences SET tags=ARRAY[repeat('a',33)] WHERE id=row_id;
    RAISE EXCEPTION 'Long tag accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.food_preferences SET tags=array_fill('a'::text,ARRAY[9]) WHERE id=row_id;
    RAISE EXCEPTION 'Too many tags accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.food_preferences SET tags=ARRAY[NULL::text] WHERE id=row_id;
    RAISE EXCEPTION 'Null tag accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END;
$test$;
RESET ROLE;
ROLLBACK;
SELECT 'Food context checks passed' AS result;
