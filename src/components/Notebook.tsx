import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowUpRight, BookOpen, Check, CheckCheck, ChevronDown, Cloud, Coffee, Cookie, Heart, Leaf, LoaderCircle, LockKeyhole, LogOut, MessageCircle, Pencil, Plus, RefreshCw, Search, Sprout, Trash2, Utensils, Wheat, X } from 'lucide-react';
import { FOOD_CATEGORIES, type FoodCategory, type FoodEntry, type FoodInput, type NotebookProps, type Preference } from '../lib/types';

const categoryIcons = { Vegetables: Sprout, Fruit: Leaf, Meals: Utensils, Desserts: Cookie, Drinks: Coffee, Snacks: Wheat, Other: Heart };
const blankEntry = (): FoodInput => ({ name: '', preference: 'like', category: 'Other', notes: '' });
const normalize = (value: string) => value.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';

function FoodIllustration() {
  return <svg className="food-illustration" viewBox="0 0 320 245" fill="none" aria-hidden="true">
    <ellipse cx="159" cy="201" rx="112" ry="17" fill="#e9e6d9" />
    <path d="M61 142c0-45 46-84 102-84s102 39 102 84-46 64-102 64-102-19-102-64Z" fill="#ede6d5" stroke="#d8cfba" strokeWidth="1.5" />
    <path d="M77 137c0-38 39-65 86-65s86 27 86 65-39 51-86 51-86-13-86-51Z" fill="#faf8ed" stroke="#d5cdbb" strokeWidth="1.5" />
    <path d="M102 137c0-26 27-45 61-45s61 19 61 45-27 35-61 35-61-9-61-35Z" stroke="#e1dac9" strokeWidth="1.5" />
    <path d="M141 118c-15-22-41-26-57-25 1 25 16 44 43 45" fill="#749879" />
    <path d="M135 131c-13-17-28-25-40-30" stroke="#426451" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M130 122c-1-30 17-53 33-63 17 25 14 52-8 73" fill="#426451" />
    <path d="M144 126c6-26 9-42 17-55" stroke="#a0b69a" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M150 126c15-27 41-33 60-30-3 28-23 44-49 44" fill="#92a581" />
    <path d="M157 133c16-16 30-25 42-28" stroke="#607958" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M157 124c-21-5-39 9-39 26 0 23 23 35 42 34 23-1 41-16 40-35-1-18-21-29-43-25Z" fill="#bd7259" />
    <path d="m158 124-14-8 3 12-13 5 17 2 7 11 4-13 15 1-10-9 7-10-16 9Z" fill="#426451" />
    <path d="M135 148c-4 8 1 16 8 19" stroke="#dba189" strokeWidth="3" strokeLinecap="round" />
    <path d="M214 47c9 15 5 32-3 44-10-10-16-29 3-44Z" fill="#92a581" />
    <path d="m211 91 9-28M65 176l-17 21M49 176l14 20" stroke="#789177" strokeWidth="2" strokeLinecap="round" />
    <path d="M57 66c-1-6 7-12 12-6 4-7 13-4 13 3 0 9-15 18-15 18s-9-9-10-15Z" stroke="#bb8b70" strokeWidth="1.5" />
    <path d="m259 106 5-7m-2 17 8 1m-23-19 1-8" stroke="#c6b08b" strokeWidth="2" strokeLinecap="round" />
    <circle cx="91" cy="47" r="3" fill="#c6b08b" /><circle cx="245" cy="181" r="3" fill="#c6b08b" />
  </svg>;
}

function Modal({ title, description, busy, onClose, children, className = '' }: { title: string; description?: string; busy?: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className={`modal ${className}`} aria-labelledby="dialog-title" aria-describedby={description ? 'dialog-description' : undefined}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="modal-inner">
      <button type="button" className="icon-button modal-close" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={21} /></button>
      <p className="eyebrow">A DETAIL WORTH KEEPING</p>
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
    if (!input.name.trim()) { setError('Enter a food or ingredient name.'); return; }
    setError(''); setBusy(true);
    try { await onSave({ ...input, name: input.name.trim(), notes: input.notes.trim() }); }
    catch (failure) { setError(messageOf(failure)); }
    finally { setBusy(false); }
  }
  return <Modal title={entry ? 'Update the details.' : 'What belongs on the list?'} description="Keep a useful reference for your next meal." busy={busy} onClose={onClose}>
    <form onSubmit={submit} className="entry-form">
      <div className="field"><label htmlFor="food-name">Food or ingredient <span aria-hidden="true">*</span></label><input id="food-name" name="name" autoFocus autoComplete="off" placeholder="E.g. tomatoes, ramen, cheesecake…" value={input.name} onChange={(e) => setInput({ ...input, name: e.target.value })} required maxLength={120} disabled={busy} /></div>
      <fieldset className="preference-field" disabled={busy}><legend>Preference</legend>
        <label className={`preference-choice choice-like ${input.preference === 'like' ? 'selected' : ''}`}><input type="radio" name="preference" value="like" checked={input.preference === 'like'} onChange={() => setInput({ ...input, preference: 'like' })} /><Heart size={19} /><span>Like</span>{input.preference === 'like' && <Check size={17} />}</label>
        <label className={`preference-choice choice-dislike ${input.preference === 'dislike' ? 'selected' : ''}`}><input type="radio" name="preference" value="dislike" checked={input.preference === 'dislike'} onChange={() => setInput({ ...input, preference: 'dislike' })} /><X size={19} /><span>Dislike</span>{input.preference === 'dislike' && <Check size={17} />}</label>
      </fieldset>
      <div className="field"><label htmlFor="food-category">Category</label><div className="select-wrap"><select id="food-category" value={input.category} onChange={(e) => setInput({ ...input, category: e.target.value as FoodCategory })} disabled={busy}>{FOOD_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></div></div>
      <div className="field"><label htmlFor="food-notes">Notes <span className="optional">optional</span></label><textarea id="food-notes" name="notes" rows={4} placeholder="E.g. great in a sauce, less keen on raw tomatoes." value={input.notes} onChange={(e) => setInput({ ...input, notes: e.target.value })} maxLength={2000} disabled={busy} /><span className="character-count">{input.notes.length} / 2000</span></div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={18} />}{busy ? 'Saving…' : entry ? 'Save changes' : 'Save entry'}</button></div>
    </form>
  </Modal>;
}

function DeleteDialog({ entry, onClose, onDelete }: { entry: FoodEntry; onClose: () => void; onDelete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() { setBusy(true); setError(''); try { await onDelete(); } catch (failure) { setError(messageOf(failure)); } finally { setBusy(false); } }
  return <Modal title="Delete this entry?" description={`„${entry.name}” will be removed from this notebook. This cannot be undone.`} busy={busy} onClose={onClose} className="modal-small">
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="modal-actions"><button autoFocus type="button" className="button button-secondary" onClick={onClose} disabled={busy}>Keep entry</button><button type="button" className="button button-danger" onClick={() => void remove()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}{busy ? 'Deleting…' : 'Delete entry'}</button></div>
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
    const needle = normalize(query.trim());
    return entries.filter((entry) => (preference === 'all' || entry.preference === preference) && (category === 'all' || entry.category === category) && (!needle || normalize(`${entry.name} ${entry.notes} ${entry.category}`).includes(needle))).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'pl') : b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name, 'pl'));
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
      setEditing(undefined); setLastSynced(new Date()); setToast(selected ? 'Changes saved.' : 'Entry saved.');
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
      setDeleting(null); setLastSynced(new Date()); setToast('Entry deleted.');
    } catch (failure) { setLastSynced(null); throw failure; }
  }
  function exportEntries() {
    const file = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries }, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a'); link.href = url; link.download = `food-whitelist-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('Your export is ready to download.');
  }
  async function signOut() { if (!onSignOut) return; setSigningOut(true); try { await onSignOut(); } catch (failure) { setError(messageOf(failure)); } finally { setSigningOut(false); } }
  const canChange = loaded && !error;

  return <div className="notebook-shell">
    <a className="skip-link" href="#notebook-content">Skip to notebook</a>
    <aside className="sidebar" aria-label="Notebook">
      <div className="brand"><span className="brand-mark"><Heart size={24} strokeWidth={1.5} /></span><span className="brand-name">Food Whitelist<span>YOUR FOOD PREFERENCE NOTEBOOK</span></span></div>
      <div className="sidebar-section"><p className="nav-label">YOUR NOTEBOOK</p><div className="nav-current" aria-current="page"><Utensils size={19} /><span>Food</span><span className="nav-count">{loaded ? counts.all : '—'}</span></div></div>
      <div className="sidebar-note"><span className="small-spark">✳</span><p>Good food.<br />Useful notes.<br /><em>Less guesswork.</em></p></div>
      <div className="future-sections"><p className="nav-label">ROOM TO GROW</p><div><BookOpen size={18} /><span>Books</span><small>Later</small></div><div><MessageCircle size={18} /><span>General notes</span><small>Later</small></div></div>
      <div className="sidebar-profile"><span className="profile-avatar">{userName?.trim().slice(0, 1).toLocaleUpperCase('pl') || <LockKeyhole size={18} />}</span><div><strong>{userName || 'Your notebook'}</strong><span>Private workspace</span></div>{onSignOut && <button type="button" className="icon-button" aria-label="Sign out" title="Sign out" onClick={() => void signOut()} disabled={signingOut}>{signingOut ? <LoaderCircle className="spin" size={18} /> : <LogOut size={18} />}</button>}</div>
    </aside>
    <main className="main-content" id="notebook-content">
      <header className="topbar"><span className="topbar-location"><span>Notebook</span><span className="location-separator">/</span>Food</span><span className={`sync-status ${error ? 'sync-error' : ''}`} aria-live="polite">{loading ? <><LoaderCircle className="spin" size={14} />Loading…</> : error ? <><Cloud size={15} />Connection unavailable</> : mode === 'demo' ? <><LockKeyhole size={14} />Local preview</> : lastSynced ? <><CheckCheck size={15} />Saved to cloud</> : <><Cloud size={15} />Waiting for connection</>}</span></header>
      {mode === 'demo' && <div className="demo-banner"><span><strong>Local preview</strong> — entries stay on this device.</span><span>Preview data is not saved to Neon.</span></div>}
      <section className="hero" aria-labelledby="page-title"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dash" />YOUR TASTE, ORGANIZED</p><h1 id="page-title">Good food,<br /><em>worth remembering.</em></h1><p>Favorites. Ingredients to avoid.<br />And all the details in between.</p><span className="hero-footnote"><Heart size={14} /> A little clarity for your next meal</span></div><div className="hero-art"><FoodIllustration /><span>a pinch of good taste</span></div></section>
      <section className="food-section" aria-labelledby="food-title">
        <div className="section-header"><div><p className="eyebrow">YOUR EVERYDAY REFERENCE</p><h2 id="food-title">On the list<span className="heading-dot">.</span></h2></div><button type="button" className="button button-primary add-button" onClick={() => setEditing(null)} disabled={!canChange}><Plus size={19} /><span>Add an entry</span></button></div>
        <div className="filter-panel"><div className="search-field"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="search-food">Search notebook</label><input id="search-food" type="search" placeholder="Search food, ingredients, notes…" value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="select-wrap category-select"><label className="sr-only" htmlFor="filter-category">Filter by category</label><select id="filter-category" value={category} onChange={(e) => setCategory(e.target.value as 'all' | FoodCategory)}><option value="all">All categories</option>{FOOD_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></div></div>
        <div className="list-toolbar"><div className="filter-tabs" role="group" aria-label="Filter preferences">{([['all', 'All entries'], ['like', 'Like'], ['dislike', 'Dislike']] as const).map(([value, label]) => <button type="button" key={value} className={`filter-tab ${preference === value ? 'active' : ''} tab-${value}`} aria-pressed={preference === value} onClick={() => setPreference(value)}>{value === 'like' && <Heart size={14} />}{value === 'dislike' && <X size={14} />}<span>{label}</span><span className="tab-count">{loaded ? counts[value] : '—'}</span></button>)}</div><div className="list-tools"><div className="select-wrap sort-select"><label className="sr-only" htmlFor="sort-food">Sort entries</label><select id="sort-food" value={sort} onChange={(e) => setSort(e.target.value as 'updated' | 'name')}><option value="updated">Recently updated</option><option value="name">Alphabetical</option></select><ChevronDown size={14} aria-hidden="true" /></div><button type="button" className="icon-button" aria-label="Refresh entries" title="Refresh entries" disabled={loading} onClick={() => void load()}><RefreshCw size={16} className={loading ? 'spin' : ''} /></button><button type="button" className="icon-button" aria-label="Export all entries as JSON" title="Download all entries (.json)" disabled={!entries.length || loading || !!error} onClick={exportEntries}><ArrowDownToLine size={17} /></button></div></div>
        {error && <div className="load-error" role="alert"><div><strong>Could not load the notebook.</strong><p>{error}</p>{loaded && <p>These entries are from the last successful refresh.</p>}</div><button type="button" className="button button-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16} />Try again</button></div>}
        {loading && !loaded ? <div className="loading-state" role="status"><LoaderCircle size={24} className="spin" /><p>Otwieram Your notebook…</p></div> : loaded && entries.length === 0 ? <div className="empty-state"><div className="empty-symbol"><Sprout size={37} strokeWidth={1.2} /><span>01</span></div><p className="eyebrow">START WITH SOMETHING SIMPLE</p><h3>A good list starts with one entry.</h3><p>A favorite meal? An ingredient to avoid?<br />Keep the details handy for next time.</p><button type="button" className="button button-text" onClick={() => setEditing(null)} disabled={!canChange}>Add your first entry <ArrowUpRight size={18} /></button></div> : loaded && visible.length === 0 ? <div className="empty-state empty-filter"><Search size={30} strokeWidth={1.4} /><h3>Nothing on the list just yet.</h3><p>Try another search or clear the filters.</p><button type="button" className="button button-secondary" onClick={resetFilters}>Clear filters</button></div> : <div className="food-grid">{visible.map((entry) => {
          const Icon = categoryIcons[entry.category] || Heart;
          return <article className={`food-card food-card-${entry.preference}`} key={entry.id}><div className="card-topline"><span className="category-icon"><Icon size={21} strokeWidth={1.5} /></span><span className={`preference-badge badge-${entry.preference}`}>{entry.preference === 'like' ? <Heart size={12} /> : <X size={12} />}{entry.preference === 'like' ? 'Like' : 'Dislike'}</span></div><p className="card-category">{entry.category}</p><h3>{entry.name}</h3>{entry.notes ? <p className="card-notes">{entry.notes}</p> : <p className="card-notes card-no-notes">No additional notes.</p>}<footer className="card-footer"><span title={`Last updated: ${new Date(entry.updatedAt).toLocaleString('en-GB')}`}>{new Date(entry.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span><div><button type="button" className="icon-button" aria-label={`Edit: ${entry.name}`} title="Edit entry" onClick={() => setEditing(entry)} disabled={!canChange}><Pencil size={16} /></button><button type="button" className="icon-button delete-icon" aria-label={`Delete: ${entry.name}`} title="Delete entry" onClick={() => setDeleting(entry)} disabled={!canChange}><Trash2 size={16} /></button></div></footer></article>;
        })}</div>}
        {loaded && entries.length > 0 && <p className="results-note">Showing {visible.length} of {entries.length} entries <span>·</span> All the useful details, together.</p>}
      </section>
      <footer className="page-footer"><span>Food Whitelist<span className="footer-dot">·</span>Your food preference notebook</span><span><LockKeyhole size={12} />{mode === 'cloud' ? 'Private to you' : 'Local preview'}</span></footer>
    </main>
    {editing !== undefined && <EntryEditor key={editing?.id || 'new'} entry={editing} onClose={() => setEditing(undefined)} onSave={save} />}
    {deleting && <DeleteDialog entry={deleting} onClose={() => setDeleting(null)} onDelete={remove} />}
    {toast && <div className="toast" role="status"><span><Check size={17} /></span>{toast}<button type="button" className="icon-button" aria-label="Zamknij powiadomienie" onClick={() => setToast('')}><X size={16} /></button></div>}
  </div>;
}
