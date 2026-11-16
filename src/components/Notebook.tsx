import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowUpRight, Beef, BookOpen, Check, CheckCheck, ChevronDown, Cloud, Coffee, Cookie, Egg, Fish, Leaf, LoaderCircle, LockKeyhole, LogOut, MessageCircle, Pencil, Plus, RefreshCw, Search, Sprout, Trash2, Utensils, Wheat, X } from 'lucide-react';
import { normalizeSearch } from '../lib/validation';
import { CATEGORY_LABELS, FOOD_CATEGORIES, type FoodCategory, type FoodEntry, type FoodInput, type NotebookProps, type Preference } from '../lib/types';

const categoryIcons = { Vegetables: Sprout, Fruit: Leaf, Meat: Beef, FishSeafood: Fish, DairyEggs: Egg, Grains: Wheat, LegumesNuts: Sprout, HerbsSpices: Leaf, Sauces: Utensils, Meals: Utensils, Desserts: Cookie, Drinks: Coffee, Snacks: Wheat, Other: Check };
const blankEntry = (): FoodInput => ({ name: '', preference: 'like', category: 'Other', notes: '' });
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Coś poszło nie tak. Spróbuj ponownie.';


function Modal({ title, description, busy, onClose, children, className = '' }: { title: string; description?: string; busy?: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className={`modal ${className}`} aria-labelledby="dialog-title" aria-describedby={description ? 'dialog-description' : undefined}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="modal-inner">
      <button type="button" className="icon-button modal-close" aria-label="Zamknij okno" onClick={onClose} disabled={busy}><X size={21} /></button>
      <p className="eyebrow">SZCZEGÓŁY WPISU</p>
      <h2 id="dialog-title">{title}</h2>
      {description && <p className="modal-description" id="dialog-description">{description}</p>}
      {children}
    </div>
  </dialog>;
}

function EntryEditor({ entry, onClose, onSave }: { entry: FoodEntry | null; onClose: () => void; onSave: (input: FoodInput) => Promise<void> }) {
  const [input, setInput] = useState<FoodInput>(entry ? { name: entry.name, preference: entry.preference, category: entry.category, notes: entry.notes } : blankEntry());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.name.trim()) { setError('Wpisz nazwę potrawy lub składnika.'); return; }
    setError(''); setBusy(true);
    try { await onSave({ ...input, name: input.name.trim(), notes: input.notes.trim() }); }
    catch (failure) { setError(messageOf(failure)); }
    finally { setBusy(false); }
  }
  return <Modal title={entry ? 'Edytuj wpis' : 'Dodaj do listy'} description="Zapisz preferencję i szczegóły, do których warto wrócić." busy={busy} onClose={onClose}>
    <form onSubmit={submit} className="entry-form">
      <div className="field"><label htmlFor="food-name">Potrawa lub składnik <span aria-hidden="true">*</span></label><input id="food-name" name="name" autoFocus autoComplete="off" placeholder="Np. pomidory, ramen, sernik…" value={input.name} onChange={(e) => setInput({ ...input, name: e.target.value })} required maxLength={120} disabled={busy} /></div>
      <fieldset className="preference-field" disabled={busy}><legend>Preferencja</legend>
        <label className={`preference-choice choice-like ${input.preference === 'like' ? 'selected' : ''}`}><input type="radio" name="preference" value="like" checked={input.preference === 'like'} onChange={() => setInput({ ...input, preference: 'like' })} /><Check size={19} /><span>Lubi</span>{input.preference === 'like' && <Check size={17} />}</label>
        <label className={`preference-choice choice-dislike ${input.preference === 'dislike' ? 'selected' : ''}`}><input type="radio" name="preference" value="dislike" checked={input.preference === 'dislike'} onChange={() => setInput({ ...input, preference: 'dislike' })} /><X size={19} /><span>Nie lubi</span>{input.preference === 'dislike' && <Check size={17} />}</label>
      </fieldset>
      <div className="field"><label htmlFor="food-category">Kategoria</label><div className="select-wrap"><select id="food-category" value={input.category} onChange={(e) => setInput({ ...input, category: e.target.value as FoodCategory })} disabled={busy}>{FOOD_CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></div></div>
      <div className="field"><label htmlFor="food-notes">Notatki <span className="optional">opcjonalnie</span></label><textarea id="food-notes" name="notes" rows={4} placeholder="Np. w sosie tak, na surowo nie." value={input.notes} onChange={(e) => setInput({ ...input, notes: e.target.value })} maxLength={2000} disabled={busy} /><span className="character-count">{input.notes.length} / 2000</span></div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose} disabled={busy}>Anuluj</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={18} />}{busy ? 'Zapisywanie…' : entry ? 'Zapisz zmiany' : 'Zapisz wpis'}</button></div>
    </form>
  </Modal>;
}

function DeleteDialog({ entry, onClose, onDelete }: { entry: FoodEntry; onClose: () => void; onDelete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() { setBusy(true); setError(''); try { await onDelete(); } catch (failure) { setError(messageOf(failure)); } finally { setBusy(false); } }
  return <Modal title="Usunąć ten wpis?" description={`„${entry.name}” zostanie usunięty z notatnika. Tej operacji nie można cofnąć.`} busy={busy} onClose={onClose} className="modal-small">
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="modal-actions"><button autoFocus type="button" className="button button-secondary" onClick={onClose} disabled={busy}>Zachowaj wpis</button><button type="button" className="button button-danger" onClick={() => void remove()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}{busy ? 'Usuwanie…' : 'Usuń wpis'}</button></div>
  </Modal>;
}

export default function Notebook({ repository, mode, userName, onSignOut }: NotebookProps) {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [query, setQuery] = useState('');
  const [preference, setPreference] = useState<'all' | Preference>('all');
  const [category, setCategory] = useState<'all' | FoodCategory>('all');
  const [sort, setSort] = useState<'updated' | 'name'>('updated');
  const [editing, setEditing] = useState<FoodEntry | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<FoodEntry | null>(null);
  const [toast, setToast] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const requests = useRef(0);
  const currentRepository = useRef(repository);
  currentRepository.current = repository;
  const load = useCallback(async () => {
    const request = ++requests.current;
    setLoading(true);
    try {
      const result = await repository.list();
      if (request !== requests.current || currentRepository.current !== repository) return;
      setEntries(result); setError(''); setLoaded(true); setLastSynced(new Date());
    } catch (failure) { if (request === requests.current && currentRepository.current === repository) { setError(messageOf(failure)); setLastSynced(null); } }
    finally { if (request === requests.current && currentRepository.current === repository) setLoading(false); }
  }, [repository]);
  useEffect(() => {
    setEntries([]); setLoaded(false); setError(''); setLastSynced(null); setEditing(undefined); setDeleting(null);
    void load();
    const onFocus = () => { if (document.visibilityState === 'visible') void load(); };
    window.addEventListener('focus', onFocus);
    return () => { ++requests.current; window.removeEventListener('focus', onFocus); };
  }, [load]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 4500); return () => window.clearTimeout(timer); }, [toast]);

  const counts = useMemo(() => ({ all: entries.length, like: entries.filter((entry) => entry.preference === 'like').length, dislike: entries.filter((entry) => entry.preference === 'dislike').length }), [entries]);
  const visible = useMemo(() => {
    const needle = normalizeSearch(query.trim());
    return entries.filter((entry) => (preference === 'all' || entry.preference === preference) && (category === 'all' || entry.category === category) && (!needle || normalizeSearch(`${entry.name} ${entry.notes} ${CATEGORY_LABELS[entry.category]}`).includes(needle))).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'pl') : b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name, 'pl'));
  }, [entries, query, preference, category, sort]);
  const resetFilters = () => { setQuery(''); setPreference('all'); setCategory('all'); };
  async function save(input: FoodInput) {
    const selected = editing;
    ++requests.current;
    setLoading(false);
    try {
      const saved = selected ? await repository.update(selected.id, input) : await repository.create(input);
      if (currentRepository.current !== repository) return;
      ++requests.current;
      setLoading(false); setEntries((previous) => selected ? previous.map((item) => item.id === saved.id ? saved : item) : [saved, ...previous.filter((item) => item.id !== saved.id)]);
      setEditing(undefined); setLastSynced(new Date()); setToast(selected ? 'Zmiany zapisane.' : 'Wpis zapisany.');
    } catch (failure) { setLastSynced(null); throw failure; }
  }
  async function remove() {
    if (!deleting) return;
    const id = deleting.id;
    ++requests.current; setLoading(false);
    try {
      await repository.remove(id);
      if (currentRepository.current !== repository) return;
      ++requests.current; setLoading(false); setEntries((previous) => previous.filter((entry) => entry.id !== id));
      setDeleting(null); setLastSynced(new Date()); setToast('Wpis usunięty.');
    } catch (failure) { setLastSynced(null); throw failure; }
  }
  function exportEntries() {
    const file = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries }, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a'); link.href = url; link.download = `food-whitelist-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('Eksport jest gotowy do pobrania.');
  }
  async function signOut() { if (!onSignOut) return; setSigningOut(true); try { await onSignOut(); } catch (failure) { setError(messageOf(failure)); } finally { setSigningOut(false); } }
  const canChange = loaded && !error;

  return <div className="notebook-shell">
    <a className="skip-link" href="#notebook-content">Przejdź do notatnika</a>
    <aside className="sidebar" aria-label="Notatnik">
      <div className="brand"><span className="brand-mark"><Utensils size={24} strokeWidth={1.5} /></span><span className="brand-name">Food Whitelist<span>NOTATNIK SMAKÓW</span></span></div>
      <div className="sidebar-section"><p className="nav-label">TWÓJ NOTATNIK</p><div className="nav-current" aria-current="page"><Utensils size={19} /><span>Jedzenie</span><span className="nav-count">{loaded ? counts.all : '—'}</span></div></div>
      <div className="sidebar-note"><span className="small-spark">[01]</span><p>Zapisz.<br />Sprawdź.<br /><em>Wybierz.</em></p></div>
      <div className="future-sections"><p className="nav-label">W PRZYSZŁOŚCI</p><div><BookOpen size={18} /><span>Książki</span><small>Wkrótce</small></div><div><MessageCircle size={18} /><span>Notatki</span><small>Wkrótce</small></div></div>
      <div className="sidebar-profile"><span className="profile-avatar">{userName?.trim().slice(0, 1).toLocaleUpperCase('pl') || <LockKeyhole size={18} />}</span><div><strong>{userName || 'Twój notatnik'}</strong><span>Prywatny dostęp</span></div>{onSignOut && <button type="button" className="icon-button" aria-label="Wyloguj się" title="Wyloguj się" onClick={() => void signOut()} disabled={signingOut}>{signingOut ? <LoaderCircle className="spin" size={18} /> : <LogOut size={18} />}</button>}</div>
    </aside>
    <main className="main-content" id="notebook-content">
      <header className="topbar"><span className="topbar-location"><span>Notatnik</span><span className="location-separator">/</span>Jedzenie</span><span className={`sync-status ${error ? 'sync-error' : ''}`} aria-live="polite">{loading ? <><LoaderCircle className="spin" size={14} />Wczytywanie…</> : error ? <><Cloud size={15} />Brak połączenia</> : mode === 'demo' ? <><LockKeyhole size={14} />Podgląd lokalny</> : lastSynced ? <><CheckCheck size={15} />Zapisano w chmurze</> : <><Cloud size={15} />Oczekiwanie na połączenie</>}</span></header>
      {mode === 'demo' && <div className="demo-banner"><span><strong>Podgląd lokalny</strong> — wpisy pozostają na tym urządzeniu.</span><span>Dane z podglądu nie trafiają do chmury.</span></div>}
      <section className="hero" aria-labelledby="page-title"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dash" />PREFERENCJE W JEDNYM MIEJSCU</p><h1 id="page-title">Mniej zgadywania.<br /><em>Więcej smaku.</em></h1><p>Co lubi, czego unika i jak to przyrządzić.<br />Konkretna lista na kolejny posiłek.</p><span className="hero-footnote"><Check size={14} /> Zapisuj raz. Wracaj, kiedy potrzebujesz.</span></div><div className="hero-summary" aria-label="Podsumowanie preferencji"><span className="summary-index">01 / JEDZENIE</span><div><span>LUBI</span><strong>{loaded ? counts.like.toString().padStart(2, '0') : '—'}</strong><Check size={23} /></div><div><span>NIE LUBI</span><strong>{loaded ? counts.dislike.toString().padStart(2, '0') : '—'}</strong><X size={23} /></div></div></section>
      <section className="food-section" aria-labelledby="food-title">
        <div className="section-header"><div><p className="eyebrow">TWOJA BAZA</p><h2 id="food-title">Lista smaków<span className="heading-dot">.</span></h2></div><button type="button" className="button button-primary add-button" onClick={() => setEditing(null)} disabled={!canChange}><Plus size={19} /><span>Dodaj wpis</span></button></div>
        <div className="filter-panel"><div className="search-field"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="search-food">Przeszukaj notatnik</label><input id="search-food" type="search" placeholder="Szukaj potraw, składników, notatek…" value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="select-wrap category-select"><label className="sr-only" htmlFor="filter-category">Filtruj według kategorii</label><select id="filter-category" value={category} onChange={(e) => setCategory(e.target.value as 'all' | FoodCategory)}><option value="all">Wszystkie kategorie</option>{FOOD_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></div></div>
        <div className="list-toolbar"><div className="filter-tabs" role="group" aria-label="Filtruj preferencje">{([['all', 'Wszystkie'], ['like', 'Lubi'], ['dislike', 'Nie lubi']] as const).map(([value, label]) => <button type="button" key={value} className={`filter-tab ${preference === value ? 'active' : ''} tab-${value}`} aria-pressed={preference === value} onClick={() => setPreference(value)}>{value === 'like' && <Check size={14} />}{value === 'dislike' && <X size={14} />}<span>{label}</span><span className="tab-count">{loaded ? counts[value] : '—'}</span></button>)}</div><div className="list-tools"><div className="select-wrap sort-select"><label className="sr-only" htmlFor="sort-food">Sortuj wpisy</label><select id="sort-food" value={sort} onChange={(e) => setSort(e.target.value as 'updated' | 'name')}><option value="updated">Ostatnio zmienione</option><option value="name">Alfabetycznie</option></select><ChevronDown size={14} aria-hidden="true" /></div><button type="button" className="icon-button" aria-label="Odśwież wpisy" title="Odśwież wpisy" disabled={loading} onClick={() => void load()}><RefreshCw size={16} className={loading ? 'spin' : ''} /></button><button type="button" className="icon-button" aria-label="Eksportuj wszystkie wpisy do JSON" title="Pobierz wszystkie wpisy (.json)" disabled={!entries.length || loading || !!error} onClick={exportEntries}><ArrowDownToLine size={17} /></button></div></div>
        {error && <div className="load-error" role="alert"><div><strong>Nie udało się wczytać notatnika.</strong><p>{error}</p>{loaded && <p>To wpisy z ostatniego udanego odświeżenia.</p>}</div><button type="button" className="button button-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16} />Spróbuj ponownie</button></div>}
        {loading && !loaded ? <div className="loading-state" role="status"><LoaderCircle size={24} className="spin" /><p>Otwieranie notatnika…</p></div> : loaded && entries.length === 0 ? <div className="empty-state"><div className="empty-symbol"><Sprout size={37} strokeWidth={1.2} /><span>01</span></div><p className="eyebrow">PIERWSZY KROK</p><h3>Pierwszy wpis robi różnicę.</h3><p>Ulubione danie? Składnik do pominięcia?<br />Zapisz i miej to z głowy.</p><button type="button" className="button button-text" onClick={() => setEditing(null)} disabled={!canChange}>Dodaj pierwszy wpis <ArrowUpRight size={18} /></button></div> : loaded && visible.length === 0 ? <div className="empty-state empty-filter"><Search size={30} strokeWidth={1.4} /><h3>Brak pasujących wpisów.</h3><p>Zmień zapytanie albo wyczyść filtry.</p><button type="button" className="button button-secondary" onClick={resetFilters}>Wyczyść filtry</button></div> : <div className="food-grid">{visible.map((entry) => {
          const Icon = categoryIcons[entry.category] || Check;
          return <article className={`food-card food-card-${entry.preference}`} key={entry.id}><div className="card-topline"><span className="category-icon"><Icon size={21} strokeWidth={1.5} /></span><span className={`preference-badge badge-${entry.preference}`}>{entry.preference === 'like' ? <Check size={12} /> : <X size={12} />}{entry.preference === 'like' ? 'Lubi' : 'Nie lubi'}</span></div><p className="card-category">{CATEGORY_LABELS[entry.category]}</p><h3>{entry.name}</h3>{entry.notes ? <p className="card-notes">{entry.notes}</p> : <p className="card-notes card-no-notes">Bez dodatkowych notatek.</p>}<footer className="card-footer"><span title={`Ostatnia zmiana: ${new Date(entry.updatedAt).toLocaleString('pl-PL')}`}>{new Date(entry.updatedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}</span><div><button type="button" className="icon-button" aria-label={`Edytuj: ${entry.name}`} title="Edytuj wpis" onClick={() => setEditing(entry)} disabled={!canChange}><Pencil size={16} /></button><button type="button" className="icon-button delete-icon" aria-label={`Usuń: ${entry.name}`} title="Usuń wpis" onClick={() => setDeleting(entry)} disabled={!canChange}><Trash2 size={16} /></button></div></footer></article>;
        })}</div>}
        {loaded && entries.length > 0 && <p className="results-note">Widoczne wpisy: {visible.length} z {entries.length} <span>·</span> Wszystkie szczegóły pod ręką.</p>}
      </section>
      <footer className="page-footer"><span>Food Whitelist<span className="footer-dot">·</span>Twój notatnik smaków</span><span><LockKeyhole size={12} />{mode === 'cloud' ? 'Tylko dla Ciebie' : 'Podgląd lokalny'}</span></footer>
    </main>
    {editing !== undefined && <EntryEditor key={editing?.id || 'new'} entry={editing} onClose={() => setEditing(undefined)} onSave={save} />}
    {deleting && <DeleteDialog entry={deleting} onClose={() => setDeleting(null)} onDelete={remove} />}
    {toast && <div className="toast" role="status"><span><Check size={17} /></span>{toast}<button type="button" className="icon-button" aria-label="Zamknij powiadomienie" onClick={() => setToast('')}><X size={16} /></button></div>}
  </div>;
}
