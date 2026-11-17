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

  it('persists pins independently of editing, and restores the same entry after deletion', async () => {
    const storage = memoryStorage();
    const repo = createDemoRepository({ storage, makeId: () => 'restorable-entry' });
    const entry = await repo.create({ ...input, kind: 'dish', tags: ['obiad'] });
    await repo.setPinned(entry.id, true);
    await repo.update(entry.id, { ...input, kind: 'dish', tags: ['obiad'], notes: 'Changed' });
    const before = (await repo.list())[0];
    expect(before.pinned).toBe(true);
    await repo.remove(entry.id);
    expect(await repo.list()).toEqual([]);
    const reopened = createDemoRepository({ storage });
    expect(await reopened.restore(entry.id)).toEqual(before);
    expect(await repo.list()).toEqual([before]);
    await expect(repo.restore(entry.id)).rejects.toThrow();
  });

  it('rejects expired undo and pinning of a deleted entry', async () => {
    let time = new Date('2026-01-01T12:00:00Z');
    const repo = createDemoRepository({ storage: memoryStorage(), now: () => time, makeId: () => 'expired' });
    const entry = await repo.create(input);
    await repo.remove(entry.id);
    await expect(repo.setPinned(entry.id, true)).rejects.toThrow();
    time = new Date(time.getTime() + 61_000);
    await expect(repo.restore(entry.id)).rejects.toThrow('Minął czas');
    expect(await repo.list()).toEqual([]);
  });
});
