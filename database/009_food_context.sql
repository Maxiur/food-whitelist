-- Add independent entry types and context tags. Existing entries remain unclassified.
BEGIN;
ALTER TABLE public.food_preferences
  ADD COLUMN kind text NOT NULL DEFAULT 'unspecified'
    CHECK (kind IN ('unspecified', 'ingredient', 'dish')),
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}';

CREATE FUNCTION app_private.valid_food_tags(value text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT cardinality(value) <= 8
    AND (cardinality(value) = 0 OR array_ndims(value) = 1)
    AND NOT EXISTS (
      SELECT 1 FROM unnest(value) AS tag
      WHERE tag IS NULL OR char_length(tag) NOT BETWEEN 1 AND 32 OR tag <> btrim(tag)
    );
$$;
REVOKE ALL ON FUNCTION app_private.valid_food_tags(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.valid_food_tags(text[]) TO authenticated;
ALTER TABLE public.food_preferences ADD CONSTRAINT food_preferences_tags_check
  CHECK (app_private.valid_food_tags(tags));
GRANT INSERT (kind, tags), UPDATE (kind, tags) ON public.food_preferences TO authenticated;
COMMIT;
