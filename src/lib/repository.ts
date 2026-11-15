import type { AppNeonClient } from './neon';
import type { FoodEntry, FoodInput, FoodRepository } from './types';
import { validateFoodInput } from './validation';

const COLUMNS = 'id,name,preference,category,notes,created_at,updated_at';
export const DEMO_STORAGE_KEY = 'food-whitelist:demo:food:v1';

export async function hasNotebookAccess(client: AppNeonClient): Promise<boolean> {
  const { data, error } = await client.rpc('has_notebook_access');
  databaseError(error);
  if (typeof data !== 'boolean') throw new Error('Could not verify notebook access.');
  return data;
}

function validEntry(value: unknown): FoodEntry {
  if (!value || typeof value !== 'object') throw new Error('Invalid stored entry.');
  const record = value as Record<string, unknown>;
  const fields = validateFoodInput(record);
  if (typeof record.id !== 'string' || !record.id ||
      typeof record.createdAt !== 'string' || !Number.isFinite(Date.parse(record.createdAt)) ||
      typeof record.updatedAt !== 'string' || !Number.isFinite(Date.parse(record.updatedAt))) {
    throw new Error('Invalid stored entry.');
  }
  return { ...fields, id: record.id, createdAt: record.createdAt, updatedAt: record.updatedAt };
}

function fromRow(row: unknown): FoodEntry {
  if (!row || typeof row !== 'object') throw new Error('The database returned an invalid entry.');
  const value = row as Record<string, unknown>;
  return validEntry({ ...value, createdAt: value.created_at, updatedAt: value.updated_at });
}

function databaseError(error: { code?: string; message?: string } | null): void {
  if (!error) return;
  if (error.code === '42501') {
    throw new Error('This account does not have access to this notebook.');
  }
  if (error.code === 'PGRST301' || error.code === 'PGRST302') {
    throw new Error('Your session has expired. Please sign in again.');
  }
  if (error.code === '23505') throw new Error('This entry already exists. Refresh the list.');
  // Do not leak raw database responses, which can include row contents.
  throw new Error('Could not connect to the database. Check your connection and try again.');
}

/** SQL RLS is the authorization boundary; the explicit owner filter is extra defense. */
export function createCloudRepository(client: AppNeonClient, ownerId: string): FoodRepository {
  if (!ownerId) throw new Error('Sign in to open the notebook.');
  return {
    async list() {
      const rows: FoodEntry[] = [];
      const pageSize = 500;
      // Read all pages; a silent server row limit must not truncate the notebook/export.
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await client.from('food_preferences').select(COLUMNS)
          .eq('owner_id', ownerId).order('created_at', { ascending: false })
          .order('id', { ascending: true }).range(offset, offset + pageSize - 1);
        databaseError(error);
        if (!Array.isArray(data)) throw new Error('The database did not return a list of entries.');
        rows.push(...data.map(fromRow));
        if (data.length < pageSize) return rows;
      }
    },
    async create(input) {
      const fields = validateFoodInput(input);
      const { data, error } = await client.from('food_preferences')
        .insert({ ...fields, owner_id: ownerId }).select(COLUMNS).single();
      databaseError(error);
      if (!data) throw new Error('The database did not confirm that this entry was saved.');
      return fromRow(data);
    },
    async update(id, input) {
      const fields = validateFoodInput(input);
      const { data, error } = await client.from('food_preferences')
        .update(fields).eq('id', id).eq('owner_id', ownerId).select(COLUMNS).single();
      databaseError(error);
      if (!data) throw new Error('Entry not found. Refresh the list and try again.');
      return fromRow(data);
    },
    async remove(id) {
      const { data, error } = await client.from('food_preferences')
        .delete().eq('id', id).eq('owner_id', ownerId).select('id');
      databaseError(error);
      if (!Array.isArray(data) || data.length !== 1) {
        throw new Error('Deletion was not confirmed. Refresh the list.');
      }
    },
  };
}

type LocalStore = Pick<Storage, 'getItem' | 'setItem'>;
interface DemoOptions {
  storage?: LocalStore;
  now?: () => Date;
  makeId?: () => string;
}

/** Explicit local preview only. Never used as a fallback after a cloud failure. */
export function createDemoRepository(options: DemoOptions = {}): FoodRepository {
  const storage = () => options.storage ?? window.localStorage;
  const now = options.now ?? (() => new Date());
  const makeId = options.makeId ?? (() => crypto.randomUUID());
  function read(): FoodEntry[] {
    try {
      const raw = storage().getItem(DEMO_STORAGE_KEY);
      if (raw === null) return [];
      const decoded: unknown = JSON.parse(raw);
      if (!Array.isArray(decoded)) throw new Error('Invalid local format');
      return decoded.map(validEntry);
    } catch {
      throw new Error('Cannot read local preview data. Check browser storage access.');
    }
  }
  function write(entries: FoodEntry[]) {
    try {
      storage().setItem(DEMO_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      throw new Error('Changes were not saved. Browser storage is unavailable or full.');
    }
  }
  return {
    async list() { return read(); },
    async create(input) {
      const fields = validateFoodInput(input);
      const timestamp = now().toISOString();
      const entry = { ...fields, id: makeId(), createdAt: timestamp, updatedAt: timestamp };
      const entries = read();
      write([entry, ...entries]);
      return entry;
    },
    async update(id, input) {
      const fields = validateFoodInput(input);
      const entries = read();
      const index = entries.findIndex(entry => entry.id === id);
      if (index < 0) throw new Error('Entry not found. Refresh the list.');
      const updated = { ...entries[index], ...fields, updatedAt: now().toISOString() };
      entries[index] = updated;
      write(entries);
      return updated;
    },
    async remove(id) {
      const entries = read();
      if (!entries.some(entry => entry.id === id)) throw new Error('Entry not found. Refresh the list.');
      write(entries.filter(entry => entry.id !== id));
    },
  };
}
