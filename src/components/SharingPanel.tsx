import { useEffect, useState, type FormEvent } from 'react';
import { Copy, UserPlus } from 'lucide-react';
import type { SharingRepository, SharingState } from '../lib/types';

export default function SharingPanel({ repository }: { repository: SharingRepository }) {
  const [state, setState] = useState<SharingState | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revision, setRevision] = useState(0);
  const link = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  useEffect(() => {
    let active = true;
    setState(null); setError(''); setConfirmRevoke(false);
    repository.get().then(value => { if (active) setState(value); }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [repository, revision]);
  async function invite(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await repository.invite(email);
      setNotice('Zaproszenie zapisane. Przekaż drugiej osobie link do strony.');
      setEmail(''); setRevision(value => value + 1);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Nie udało się zapisać zaproszenia.'); }
    finally { setBusy(false); }
  }
  async function revoke() {
    if (busy || state?.role !== 'owner' || !state.email) return;
    setBusy(true); setError(''); setNotice('');
    try { await repository.revoke(state.email); setNotice('Dostęp cofnięty.'); setRevision(value => value + 1); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Nie udało się cofnąć dostępu.'); }
    finally { setBusy(false); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(link); setNotice('Link skopiowany.'); }
    catch { setNotice('Nie udało się skopiować. Zaznacz i skopiuj link z pola poniżej.'); }
  }
  return <section className="sharing-section"><p className="eyebrow">WSPÓLNY NOTATNIK</p><h3>Druga osoba</h3>
    {!state && !error && <p role="status">Sprawdzanie dostępu…</p>}
    {state?.role === 'member' && <p>Masz dostęp do wspólnej listy. Zaproszeniem zarządza właściciel notatnika.</p>}
    {state?.role === 'owner' && <>
      <p>Zaproszona osoba będzie mogła przeglądać, dodawać, edytować i usuwać wpisy. Każde z Was loguje się na własne konto.</p>
      {state.legacyMember ? <p>Dostęp drugiej osoby jest już skonfigurowany ręcznie.</p> : state.email ? <>
        <p className="settings-email"><strong>{state.email}</strong><br />{state.status === 'active' ? 'Adres potwierdzony — dostęp aktywny.' : 'Oczekiwanie na logowanie i potwierdzenie adresu.'}</p>
        <label className="field">Link do przekazania<input readOnly value={link} onFocus={event => event.target.select()} /></label>
        <button type="button" className="button button-secondary" onClick={() => void copyLink()}><Copy size={16} />Skopiuj link</button>
        <small>Przekaż link samodzielnie — wiadomość z zaproszeniem nie jest wysyłana automatycznie. Druga osoba powinna zalogować się przypisanym adresem; przy pierwszym logowaniu wybrać „Kod z e-maila”.</small>
        {confirmRevoke ? <div className="revoke-confirm"><p>Cofnąć dostęp dla {state.email}? Wasze wpisy pozostaną w notatniku.</p><button className="button button-danger" type="button" disabled={busy} onClick={() => void revoke()}>Tak, cofnij dostęp</button><button className="auth-text-button" type="button" disabled={busy} onClick={() => setConfirmRevoke(false)}>Anuluj</button></div> : <button className="auth-text-button" type="button" onClick={() => setConfirmRevoke(true)} disabled={busy}>{state.status === 'active' ? 'Cofnij dostęp' : 'Anuluj zaproszenie'}</button>}
      </> : <form onSubmit={invite} className="invite-form"><label className="field">Adres e-mail drugiej osoby<input type="email" autoComplete="off" required maxLength={254} value={email} disabled={busy} onChange={event => setEmail(event.target.value)} placeholder="osoba@example.com" /></label><button type="submit" className="button button-secondary" disabled={busy}><UserPlus size={17} />{busy ? 'Zapisywanie…' : 'Zapisz zaproszenie'}</button><small>Po zapisaniu skopiujesz link do przekazania. Dostęp otrzyma wyłącznie wskazany adres.</small></form>}
    </>}
    {error && <><p className="error-message" role="alert">{error}</p><button className="auth-text-button" type="button" disabled={busy} onClick={() => { setNotice(''); setRevision(value => value + 1); }}>Odśwież dostęp</button></>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
