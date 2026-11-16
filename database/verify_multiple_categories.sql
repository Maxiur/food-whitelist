-- Isolated test branch only; changes are rolled back.
BEGIN;
INSERT INTO app_private.allowed_owner(singleton,user_id) VALUES(1,'__multi_test__') ON CONFLICT(singleton) DO UPDATE SET user_id=EXCLUDED.user_id;
SET LOCAL request.jwt.claims = '{"sub":"__multi_test__"}';
SET LOCAL ROLE authenticated;
DO $test$ DECLARE row_id uuid; result text[]; BEGIN INSERT INTO public.food_preferences(name,preference,category,categories) VALUES ('__multi_test__','like','Sweets',ARRAY['Sweets','Snacks']) RETURNING id INTO row_id; SELECT categories INTO result FROM public.food_preferences WHERE id=row_id; IF result IS DISTINCT FROM ARRAY['Sweets','Snacks'] THEN RAISE EXCEPTION 'Multiple categories lost'; END IF; UPDATE public.food_preferences SET category='Meat' WHERE id=row_id; SELECT categories INTO result FROM public.food_preferences WHERE id=row_id; IF result IS DISTINCT FROM ARRAY['Meat'] THEN RAISE EXCEPTION 'Legacy update broken'; END IF; BEGIN UPDATE public.food_preferences SET categories=ARRAY['unknown'] WHERE id=row_id; RAISE EXCEPTION 'Invalid category allowed'; EXCEPTION WHEN check_violation THEN NULL; END; END; $test$;
RESET ROLE;
ROLLBACK;
SELECT 'Multiple-category and legacy-client checks passed' AS result;

