import { CATEGORY_LABELS, FOOD_CATEGORIES, FOOD_KINDS, KIND_LABELS, type FoodCategory, type FoodKind } from '../lib/types';

export default function FoodFilters({ categories, kinds, tags, availableTags, onCategories, onKinds, onTags }: {
  categories: FoodCategory[]; kinds: FoodKind[]; tags: string[]; availableTags: string[];
  onCategories: (value: FoodCategory[]) => void; onKinds: (value: FoodKind[]) => void; onTags: (value: string[]) => void;
}) {
  const count = categories.length + kinds.length + tags.length;
  function toggle<T extends string>(values: T[], value: T): T[] {
    return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
  }
  return <details className="advanced-filters">
    <summary>Filtry <span>{count ? `Wybrano: ${count}` : 'Kategorie, typ i tagi'}</span></summary>
    <div className="advanced-filters-body">
      <p>W obrębie jednej grupy wystarczy dowolne dopasowanie. Różne grupy zawężają wyniki.</p>
      <fieldset className="category-options"><legend>Kategorie</legend>{FOOD_CATEGORIES.map(value => <label key={value}><input type="checkbox" checked={categories.includes(value)} onChange={() => onCategories(toggle(categories, value))} /><span>{CATEGORY_LABELS[value]}</span></label>)}</fieldset>
      <fieldset className="category-options"><legend>Typ wpisu</legend>{FOOD_KINDS.map(value => <label key={value}><input type="checkbox" checked={kinds.includes(value)} onChange={() => onKinds(toggle(kinds, value))} /><span>{KIND_LABELS[value]}</span></label>)}</fieldset>
      {availableTags.length > 0 && <fieldset className="category-options"><legend>Tagi</legend>{availableTags.map(value => <label key={value}><input type="checkbox" checked={tags.includes(value)} onChange={() => onTags(toggle(tags, value))} /><span>#{value}</span></label>)}</fieldset>}
      {count > 0 && <button type="button" className="auth-text-button" onClick={() => { onCategories([]); onKinds([]); onTags([]); }}>Wyczyść kategorie, typ i tagi</button>}
    </div>
  </details>;
}
