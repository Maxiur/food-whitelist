-- Preserve legacy category as the first selected category for old clients.
BEGIN;
ALTER TABLE public.food_preferences ADD COLUMN IF NOT EXISTS categories text[];
-- Keep original edit timestamps during the mechanical backfill.
ALTER TABLE public.food_preferences DISABLE TRIGGER food_preferences_updated_at;
UPDATE public.food_preferences SET categories = ARRAY[category] WHERE categories IS NULL;
ALTER TABLE public.food_preferences ENABLE TRIGGER food_preferences_updated_at;
ALTER TABLE public.food_preferences DROP CONSTRAINT food_preferences_category_check;
ALTER TABLE public.food_preferences ADD CONSTRAINT food_preferences_category_check CHECK (category IN (
  'Vegetables','Fruit','Meat','FishSeafood','DairyEggs','Grains','LegumesNuts','HerbsSpices','Sauces','Meals','Desserts','Sweets','Drinks','Snacks','Other'));
ALTER TABLE public.food_preferences ADD CONSTRAINT food_preferences_categories_check CHECK (
  cardinality(categories) BETWEEN 1 AND 15 AND array_position(categories, NULL) IS NULL
  AND categories <@ ARRAY['Vegetables','Fruit','Meat','FishSeafood','DairyEggs','Grains','LegumesNuts','HerbsSpices','Sauces','Meals','Desserts','Sweets','Drinks','Snacks','Other']::text[]
);
CREATE OR REPLACE FUNCTION app_private.sync_food_categories()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog
AS $sync$
BEGIN
  IF NEW.categories IS NULL THEN NEW.categories := ARRAY[NEW.category];
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.category IS DISTINCT FROM OLD.category AND NEW.categories IS NOT DISTINCT FROM OLD.categories THEN
      NEW.categories := ARRAY[NEW.category];
    END IF;
  END IF;
  NEW.category := NEW.categories[1];
  RETURN NEW;
END;
$sync$;
REVOKE ALL ON FUNCTION app_private.sync_food_categories() FROM PUBLIC, anonymous, authenticated;
CREATE TRIGGER food_categories_sync BEFORE INSERT OR UPDATE ON public.food_preferences
  FOR EACH ROW EXECUTE FUNCTION app_private.sync_food_categories();
ALTER TABLE public.food_preferences ALTER COLUMN categories SET NOT NULL;
GRANT INSERT (categories), UPDATE (categories) ON public.food_preferences TO authenticated;
COMMIT;
