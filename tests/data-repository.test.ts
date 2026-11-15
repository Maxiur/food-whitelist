import { describe, expect, it } from 'vitest';
import { createDemoRepository, DEMO_STORAGE_KEY } from '../src/lib/repository';
import type { FoodInput } from '../src/lib/types';

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const input: FoodInput = { name: 'Tomatoes', preference: 'like', category: 'Vegetables', notes: 'Only in sauce.' };

describe('explicit local preview repository', () => {
  it('starts empty and persists CRUD across instances without seeded personal data', async () => {
    const storage = memoryStorage();
    const repo = createDemoRepository({ storage, makeId: () => 'test-entry' });
    expect(await repo.list()).toEqual([]);
    const created = await repo.create(input);
    const reopened = createDemoRepository({ storage });
    expect(await reopened.list()).toEqual([created]);
    await reopened.update(created.id, { ...input, preference: 'dislike' });
    expect((await repo.list())[0].preference).toBe('dislike');
    await reopened.remove(created.id);
    expect(await repo.list()).toEqual([]);
  });

  it('rejects failed persistence instead of reporting a successful save', async () => {
    const repo = createDemoRepository({ storage: { getItem: () => null, setItem: () => { throw new Error('Quota exceeded'); } } });
    await expect(repo.create(input)).rejects.toThrow('Zmiany nie zostały zapisane');
  });

  it('does not overwrite malformed stored data', async () => {
    const storage = memoryStorage();
    storage.setItem(DEMO_STORAGE_KEY, '{broken');
    const repo = createDemoRepository({ storage });
    await expect(repo.create(input)).rejects.toThrow('Nie można odczytać');
    expect(storage.getItem(DEMO_STORAGE_KEY)).toBe('{broken');
  });

  it('reports stale mutations instead of success', async () => {
    const repo = createDemoRepository({ storage: memoryStorage() });
    await expect(repo.remove('already-deleted')).rejects.toThrow('Nie znaleziono wpisu');
    await expect(repo.update('already-deleted', input)).rejects.toThrow('Nie znaleziono wpisu');
  });
});
