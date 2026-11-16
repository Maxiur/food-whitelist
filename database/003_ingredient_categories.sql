-- Expand the existing category constraint without changing any stored entries.
-- Apply after 001_food_preferences.sql. Safe to rerun.
BEGIN;
ALTER TABLE public.food_preferences
  DROP CONSTRAINT food_preferences_category_check,
  ADD CONSTRAINT food_preferences_category_check CHECK (category IN (
    'Vegetables', 'Fruit', 'Meat', 'FishSeafood', 'DairyEggs',
    'Grains', 'LegumesNuts', 'HerbsSpices', 'Sauces',
    'Meals', 'Desserts', 'Drinks', 'Snacks', 'Other'
  ));
COMMIT;
