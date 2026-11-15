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
    throw new InputValidationError('Invalid entry format.');
  }
  const input = value as Record<string, unknown>;
  if (typeof input.name !== 'string' || !input.name.trim()) {
    throw new InputValidationError('Enter a food name.', 'name');
  }
  const name = input.name.trim();
  if (name.length > 120) {
    throw new InputValidationError('The name can have at most 120 characters.', 'name');
  }
  if (input.preference !== 'like' && input.preference !== 'dislike') {
    throw new InputValidationError('Choose Like or Dislike.', 'preference');
  }
  if (typeof input.category !== 'string' || !(FOOD_CATEGORIES as readonly string[]).includes(input.category)) {
    throw new InputValidationError('Choose a category from the list.', 'category');
  }
  if (typeof input.notes !== 'string' || input.notes.length > 2000) {
    throw new InputValidationError('Notes can have at most 2000 characters.', 'notes');
  }
  return {
    name,
    preference: input.preference,
    category: input.category as FoodInput['category'],
    notes: input.notes.trim(),
  };
}

export function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('ł', 'l').trim();
}
