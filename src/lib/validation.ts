import { FOOD_CATEGORIES, FOOD_KINDS, type FoodInput, type FoodKind } from './types';

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
  const kind = input.kind === undefined ? 'unspecified' : input.kind;
  if (!(FOOD_KINDS as readonly unknown[]).includes(kind)) {
    throw new InputValidationError('Wybierz typ wpisu z listy.', 'kind');
  }
  const rawTags = input.tags === undefined ? [] : input.tags;
  if (!Array.isArray(rawTags) || rawTags.length > 32 || rawTags.some(tag => typeof tag !== 'string' || tag.length > 264)) {
    throw new InputValidationError('Nieprawidłowy format tagów.', 'tags');
  }
  const tags = [...new Set(rawTags.map(tag => tag.trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLocaleLowerCase('pl')).filter(Boolean))];
  if (tags.length > 8 || tags.some(tag => tag.length > 32)) {
    throw new InputValidationError('Dodaj maksymalnie 8 tagów, każdy do 32 znaków.', 'tags');
  }
  return {
    name,
    preference: input.preference,
    category: categories[0] as FoodInput['category'],
    categories: [...new Set(categories)] as FoodInput['category'][],
    kind: kind as FoodKind,
    tags,
    notes: input.notes.trim(),
  };
}

export function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('ł', 'l').trim();
}
