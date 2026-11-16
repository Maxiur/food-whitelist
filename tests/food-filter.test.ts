import { expect, it } from 'vitest';
import { filterFood } from '../src/lib/food-filter';
import type { FoodEntry } from '../src/lib/types';

const base = { preference: 'like', notes: '', createdAt: '2026-01-01', updatedAt: '2026-01-01' } as const;
const entries: FoodEntry[] = [
  { ...base, id: '1', name: 'Pasta', category: 'FishSeafood', categories: ['FishSeafood', 'Sauces'], kind: 'dish', tags: ['śniadanie', 'na szybko'] },
  { ...base, id: '2', name: 'Ziemniaki', category: 'Vegetables', kind: 'ingredient', tags: ['dodatek'] },
  { ...base, id: '3', name: 'Frytki', category: 'Meals' },
];
const filters = { query: '', preference: 'all', categories: [], kinds: [], tags: [] } as const;
const defaults = { ...filters, categories: [], kinds: [], tags: [] };
it('matches any selected category and intersects separate filter groups', () => {
  expect(filterFood(entries, { ...defaults, categories: ['Vegetables', 'Sauces'] }).map(x => x.id)).toEqual(['1', '2']);
  expect(filterFood(entries, { ...defaults, categories: ['Vegetables', 'Sauces'], kinds: ['dish'], tags: ['śniadanie', 'restauracja'] }).map(x => x.id)).toEqual(['1']);
  expect(filterFood(entries, { ...defaults, kinds: ['ingredient'], tags: ['śniadanie'] })).toEqual([]);
});
it('retains unclassified legacy entries and searches tags without accents', () => {
  expect(filterFood(entries, { ...defaults, kinds: ['unspecified'] }).map(x => x.id)).toEqual(['3']);
  expect(filterFood(entries, { ...defaults, query: '#sniadanie' }).map(x => x.id)).toEqual(['1']);
  expect(filterFood(entries, defaults)).toHaveLength(3);
});
