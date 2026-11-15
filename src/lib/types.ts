export type Preference = 'like' | 'dislike';

export const FOOD_CATEGORIES = ['Vegetables', 'Fruit', 'Meals', 'Desserts', 'Drinks', 'Snacks', 'Other'] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export interface FoodInput {
  name: string;
  preference: Preference;
  category: FoodCategory;
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
  onSignOut?: () => Promise<void>;
}
