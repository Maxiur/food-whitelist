import { CATEGORY_LABELS, KIND_LABELS, type FoodCategory, type FoodEntry, type FoodKind, type Preference } from './types';
import { normalizeSearch } from './validation';

export function filterFood(entries: FoodEntry[], filters: {
  query: string; preference: 'all' | Preference; categories: FoodCategory[];
  kinds: FoodKind[]; tags: string[];
}) {
  const needle = normalizeSearch(filters.query).replace(/^#/, '');
  return entries.filter(entry => {
    const categories = entry.categories || [entry.category];
    const kind = entry.kind || 'unspecified';
    return (filters.preference === 'all' || entry.preference === filters.preference)
      && (!filters.categories.length || filters.categories.some(category => categories.includes(category)))
      && (!filters.kinds.length || filters.kinds.includes(kind))
      && (!filters.tags.length || filters.tags.some(tag => entry.tags?.includes(tag)))
      && (!needle || normalizeSearch([entry.name, entry.notes, KIND_LABELS[kind], ...categories.map(category => CATEGORY_LABELS[category]), ...(entry.tags || [])].join(' ')).includes(needle));
  });
}
