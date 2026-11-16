import type { AppNeonClient } from './neon';
import type { FoodEntry, FoodInput, FoodRepository } from './types';
import { validateFoodInput } from './validation';

const COLUMNS = 'id,name,preference,category,categories,notes,created_at,updated_at';
export const DEMO_STORAGE_KEY = 'food-whitelist:demo:food:v1';

export async function getNotebookOwnerId(client: AppNeonClient): Promise<string | null> {
  const { data, error } = await client.rpc('get_notebook_owner_id');
  databaseError(error);
  if (data !== null && (typeof data !== 'string' || !data)) throw new Error('Nie udało się sprawdzić dostępu do notatnika.');
  return data;
}

function validEntry(value: unknown): FoodEntry {
  if (!value || typeof value !== 'object') throw new Error('Zapisany wpis ma nieprawidłowy format.');
  const record = value as Record<string, unknown>;
  const fields = validateFoodInput(record);
  if (typeof record.id !== 'string' || !record.id ||
      typeof record.createdAt !== 'string' || !Number.isFinite(Date.parse(record.createdAt)) ||
      typeof record.updatedAt !== 'string' || !Number.isFinite(Date.parse(record.updatedAt))) {
    throw new Error('Zapisany wpis ma nieprawidłowy format.');
  }
  return { ...fields, id: record.id, createdAt: record.createdAt, updatedAt: record.updatedAt };
}

function fromRow(row: unknown): FoodEntry {
  if (!row || typeof row !== 'object') throw new Error('Baza zwróciła wpis w nieprawidłowym formacie.');
  const value = row as Record<string, unknown>;
  return validEntry({ ...value, createdAt: value.created_at, updatedAt: value.updated_at });
}

function databaseError(error: { code?: string; message?: string } | null): void {
  if (!error) return;
  if (error.code === '42501') {
    throw new Error('To konto nie ma dostępu do notatnika.');
  }
  if (error.code === 'PGRST301' || error.code === 'PGRST302') {
    throw new Error('Sesja wygasła. Zaloguj się ponownie.');
  }
  if (error.code === '23505') throw new Error('Ten wpis już istnieje. Odśwież listę.');
  // Do not leak raw database responses, which can include row contents.
  throw new Error('Nie udało się połączyć z bazą. Sprawdź połączenie i spróbuj ponownie.');
}

/** SQL RLS is the authorization boundary; the explicit owner filter is extra defense. */
export function createCloudRepository(client: AppNeonClient, ownerId: string): FoodRepository {
  if (!ownerId) throw new Error('Zaloguj się, aby otworzyć notatnik.');
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
        if (!Array.isArray(data)) throw new Error('Baza nie zwróciła listy wpisów.');
        rows.push(...data.map(fromRow));
        if (data.length < pageSize) return rows;
      }
    },
    async create(input) {
      const fields = validateFoodInput(input);
      const { data, error } = await client.from('food_preferences')
        .insert({ ...fields, owner_id: ownerId }).select(COLUMNS).single();
      databaseError(error);
      if (!data) throw new Error('Baza nie potwierdziła zapisu wpisu.');
      return fromRow(data);
    },
    async update(id, input) {
      const fields = validateFoodInput(input);
      const { data, error } = await client.from('food_preferences')
        .update(fields).eq('id', id).eq('owner_id', ownerId).select(COLUMNS).single();
      databaseError(error);
      if (!data) throw new Error('Nie znaleziono wpisu. Odśwież listę i spróbuj ponownie.');
      return fromRow(data);
    },
    async remove(id) {
      const { data, error } = await client.from('food_preferences')
        .delete().eq('id', id).eq('owner_id', ownerId).select('id');
      databaseError(error);
      if (!Array.isArray(data) || data.length !== 1) {
        throw new Error('Usunięcie nie zostało potwierdzone. Odśwież listę.');
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
      throw new Error('Nie można odczytać danych podglądu. Sprawdź dostęp do pamięci przeglądarki.');
    }
  }
  function write(entries: FoodEntry[]) {
    try {
      storage().setItem(DEMO_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      throw new Error('Zmiany nie zostały zapisane. Pamięć przeglądarki jest niedostępna lub pełna.');
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
      if (index < 0) throw new Error('Nie znaleziono wpisu. Odśwież listę.');
      const updated = { ...entries[index], ...fields, updatedAt: now().toISOString() };
      entries[index] = updated;
      write(entries);
      return updated;
    },
    async remove(id) {
      const entries = read();
      if (!entries.some(entry => entry.id === id)) throw new Error('Nie znaleziono wpisu. Odśwież listę.');
      write(entries.filter(entry => entry.id !== id));
    },
  };
}
