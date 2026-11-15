import { describe, expect, it } from 'vitest';
import { normalizeSearch, validateFoodInput } from '../src/lib/validation';

const valid = { name: ' Tomatoes ', preference: 'like', category: 'Vegetables', notes: ' Only in sauce. ' };

describe('food input boundary', () => {
  it('normalizes values and discards caller-controlled ownership fields', () => {
    expect(validateFoodInput({ ...valid, owner_id: 'someone-else', id: 'fake' })).toEqual({
      name: 'Tomatoes', preference: 'like', category: 'Vegetables', notes: 'Only in sauce.',
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
});
