import type { FoodEntry } from './types';

export function compareFood(a: FoodEntry, b: FoodEntry, sort: 'name' | 'updated') {
  return Number(!!b.pinned) - Number(!!a.pinned) || (sort === 'name'
    ? a.name.localeCompare(b.name, 'pl')
    : b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name, 'pl'));
}

export function pickFood(visible: FoodEntry[], previousId?: string): FoodEntry | null {
  const candidates = visible.filter(entry => entry.preference === 'like' && entry.kind === 'dish');
  const choices = candidates.length > 1 ? candidates.filter(entry => entry.id !== previousId) : candidates;
  return choices[Math.floor(Math.random() * choices.length)] || null;
}
