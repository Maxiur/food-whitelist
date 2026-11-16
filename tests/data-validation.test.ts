import { describe, expect, it } from 'vitest';
import { normalizeSearch, validateFoodInput } from '../src/lib/validation';
import { FOOD_CATEGORIES } from '../src/lib/types';

const valid = { name: ' Tomatoes ', preference: 'like', category: 'Vegetables', notes: ' Only in sauce. ' };

describe('food input boundary', () => {
  it('normalizes values and discards caller-controlled ownership fields', () => {
    expect(validateFoodInput({ ...valid, owner_id: 'someone-else', id: 'fake' })).toEqual({
      name: 'Tomatoes', preference: 'like', category: 'Vegetables', categories: ['Vegetables'], kind: 'unspecified', tags: [], notes: 'Only in sauce.',
    });
  });

  it.each([
    { ...valid, name: '  ' },
    { ...valid, name: 'a'.repeat(121) },
    { ...valid, notes: 'a'.repeat(2001) },
    { ...valid, notes: null },
    { ...valid, preference: 'unknown' },
    { ...valid, category: 'unknown' },
    null,
  ])('rejects invalid input before persistence (%j)', (input) => {
    expect(() => validateFoodInput(input)).toThrow();
  });

  it('supports searching Polish names without accents', () => {
    expect(normalizeSearch('  Żółty ŚLEDŹ  ')).toBe('zolty sledz');
  });

  it('deduplicates multiple categories and rejects empty or unknown selections', () => {
    expect(validateFoodInput({ ...valid, categories: ['Sweets', 'Snacks', 'Sweets'] }).categories).toEqual(['Sweets', 'Snacks']);
    expect(() => validateFoodInput({ ...valid, categories: [] })).toThrow();
    expect(() => validateFoodInput({ ...valid, categories: ['unknown'] })).toThrow();
  });

  it.each(FOOD_CATEGORIES)('accepts the persisted category %s', (category) => {
    expect(validateFoodInput({ ...valid, category }).category).toBe(category);
  });

  it('normalizes tags independently of categories and type', () => {
    expect(validateFoodInput({ ...valid, kind: 'dish', tags: [' #Śniadanie ', 'na  szybko', 'śniadanie', ''] }))
      .toMatchObject({ kind: 'dish', category: 'Vegetables', tags: ['śniadanie', 'na szybko'] });
  });

  it.each([{ kind: 'other' }, { kind: null }, { tags: [null] }, { tags: ['x'.repeat(33)] }, { tags: Array.from({ length: 9 }, (_, i) => `tag${i}`) }])('rejects invalid context %j', extra => {
    expect(() => validateFoodInput({ ...valid, ...extra })).toThrow();
  });
});
