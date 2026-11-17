import { expect, it, vi } from 'vitest';
import { compareFood, pickFood } from '../src/lib/food-actions';
import type { FoodEntry } from '../src/lib/types';

const entry: FoodEntry = { id: '1', name: 'Zupa', preference: 'like', category: 'Meals', kind: 'dish', notes: '', createdAt: '2026-01-01', updatedAt: '2026-01-01' };
it('puts pins first without losing the selected sorting inside each group', () => {
  const entries = [entry, { ...entry, id: '2', name: 'Arbuz', kind: 'ingredient' as const, pinned: true }, { ...entry, id: '3', name: 'Makaron', updatedAt: '2026-02-01' }];
  expect([...entries].sort((a, b) => compareFood(a, b, 'name')).map(value => value.id)).toEqual(['2', '3', '1']);
  expect([...entries].sort((a, b) => compareFood(a, b, 'updated')).map(value => value.id)).toEqual(['2', '3', '1']);
});
it('draws only liked dishes from supplied results, avoiding an immediate repeat', () => {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0);
  try {
    const entries = [entry, { ...entry, id: '2', preference: 'dislike' as const }, { ...entry, id: '3', kind: 'ingredient' as const }, { ...entry, id: '4' }];
    expect(pickFood(entries, '1')?.id).toBe('4');
    expect(pickFood([entry], '1')?.id).toBe('1');
    expect(pickFood(entries.slice(1, 3))).toBeNull();
    expect(pickFood([])).toBeNull();
  } finally { random.mockRestore(); }
});
