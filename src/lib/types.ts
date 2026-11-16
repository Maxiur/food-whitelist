export type Preference = 'like' | 'dislike';

export const FOOD_CATEGORIES = [
  'Vegetables', 'Fruit', 'Meat', 'FishSeafood', 'DairyEggs',
  'Grains', 'LegumesNuts', 'HerbsSpices', 'Sauces',
  'Meals', 'Desserts', 'Sweets', 'Drinks', 'Snacks', 'Other',
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

// Stable database values are independent of the interface language.
export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  Vegetables: 'Warzywa', Fruit: 'Owoce', Meals: 'Dania', Desserts: 'Desery',
  Drinks: 'Napoje', Snacks: 'Przekąski', Other: 'Inne',
  Sweets: 'Słodycze',
  Meat: 'Mięso', FishSeafood: 'Ryby i owoce morza', DairyEggs: 'Nabiał i jaja',
  Grains: 'Produkty zbożowe', LegumesNuts: 'Strączki i orzechy',
  HerbsSpices: 'Zioła i przyprawy', Sauces: 'Sosy i dodatki',
};

export interface FoodInput {
  name: string;
  preference: Preference;
  category: FoodCategory;
  categories?: FoodCategory[];
  notes: string;
}

export interface FoodEntry extends FoodInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodRepository {
  list(): Promise<FoodEntry[]>;
  create(input: FoodInput): Promise<FoodEntry>;
  update(id: string, input: FoodInput): Promise<FoodEntry>;
  remove(id: string): Promise<void>;
}

export interface NotebookProps {
  repository: FoodRepository;
  mode: 'demo' | 'cloud';
  userName?: string;
  draftScope?: string;
  onManagePassword?: () => void;
  onSignOut?: () => Promise<void>;
}
