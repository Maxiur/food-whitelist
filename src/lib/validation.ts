import { FOOD_CATEGORIES, type FoodInput } from './types';

export class InputValidationError extends Error {
  constructor(message: string, public readonly field?: keyof FoodInput) {
    super(message);
    this.name = 'InputValidationError';
  }
}

/** Validate untrusted form/import data before either local or remote persistence. */
export function validateFoodInput(value: unknown): FoodInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InputValidationError('Nieprawidłowy format wpisu.');
  }
  const input = value as Record<string, unknown>;
  if (typeof input.name !== 'string' || !input.name.trim()) {
    throw new InputValidationError('Wpisz nazwę potrawy lub składnika.', 'name');
  }
  const name = input.name.trim();
  if (name.length > 120) {
    throw new InputValidationError('Nazwa może mieć maksymalnie 120 znaków.', 'name');
  }
  if (input.preference !== 'like' && input.preference !== 'dislike') {
    throw new InputValidationError('Wybierz: lubi lub nie lubi.', 'preference');
  }
  const categories = input.categories === undefined ? [input.category] : input.categories;
  if (!Array.isArray(categories) || !categories.length || categories.length > FOOD_CATEGORIES.length ||
      categories.some(category => typeof category !== 'string' || !(FOOD_CATEGORIES as readonly string[]).includes(category))) {
    throw new InputValidationError('Wybierz kategorię z listy.', 'category');
  }
  if (typeof input.notes !== 'string' || input.notes.length > 2000) {
    throw new InputValidationError('Notatki mogą mieć maksymalnie 2000 znaków.', 'notes');
  }
  return {
    name,
    preference: input.preference,
    category: categories[0] as FoodInput['category'],
    categories: [...new Set(categories)] as FoodInput['category'][],
    notes: input.notes.trim(),
  };
}

export function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('ł', 'l').trim();
}
