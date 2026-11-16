import type { FoodInput } from './types';
import { validateFoodInput } from './validation';
export const draftKey = (scope: string, id?: string) => `food-whitelist:draft:${scope}:${id || 'new'}`;
export function readDraft(key: string): FoodInput | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!value || typeof value.name !== 'string' || value.name.length > 120) return null;
    const tags = value.tags === undefined ? [] : value.tags;
    if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string') || tags.join(',').length > 264) return null;
    const validated = validateFoodInput({ ...value, tags: [], name: value.name.trim() || 'Draft', categories: Array.isArray(value.categories) && !value.categories.length ? ['Other'] : value.categories });
    return { ...validated, tags, name: value.name, notes: value.notes, categories: Array.isArray(value.categories) && !value.categories.length ? [] : validated.categories };
  } catch { return null; }
}
export function saveDraft(key: string, value: FoodInput): boolean {
  try { sessionStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
export function removeDraft(key: string) { try { sessionStorage.removeItem(key); } catch { /* Storage unavailable. */ } }
