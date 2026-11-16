import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Utensils, LockKeyhole, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import Notebook from './components/Notebook';
import PasswordForm from './components/PasswordForm';
import { neonClient, type AppNeonClient } from './lib/neon';
import { createCloudRepository, createDemoRepository, getNotebookOwnerId } from './lib/repository';
import { clearPendingLogin, readPendingLogin, resendCooldown, savePendingLogin } from './lib/pending-login';
import './auth.css';

function AuthShell({ children }: { children: ReactNode }) {
  return <main className="auth-page">
    <a className="auth-brand" href="./" aria-label="Food Whitelist — strona główna"><span><Utensils size={22} /></span> Food Whitelist<span className="auth-brand-dot">.</span></a>
    <section className="auth-layout">
      <div className="auth-intro">
        <p className="eyebrow">TWÓJ NOTATNIK SMAKÓW</p>
        <h1>Mniej zgadywania.<br /><em>Więcej smaku.</em></h1>
        <p>Ulubione potrawy, składniki do pominięcia i konkretne notatki. Wszystko pod ręką.</p>
        <div className="auth-note"><Utensils size={18} /><span>Jedna lista. Łatwiejszy wybór kolejnego posiłku.</span></div>
      </div>
      <div className="auth-card">{children}</div>
    </section>
    <footer className="auth-footer"><LockKeyhole size={14} /> Twój prywatny notatnik <span>FOOD WHITELIST · 01</span></footer>
  </main>;
}

export function Login({ client }: { client: AppNeonClient }) {
  const [pending] = useState(() => readPendingLogin());
  const [passwordMode, setPasswordMode] = useState(!pending);
  const [email, setEmail] = useState(pending?.email || '');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(Boolean(pending));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentAt, setSentAt] = useState(pending?.sentAt || 0);
  const [cooldown, setCooldown] = useState(() => resendCooldown(pending?.sentAt || 0));
  useEffect(() => {
    const refresh = () => setCooldown(resendCooldown(sentAt));
    refresh();
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [sentAt]);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy || cooldown) return;
    setBusy(true); setError('');
    try {
      const result = await client.auth.emailOtp.sendVerificationOtp({ email: email.trim(), type: 'sign-in' });
      if (result.error) throw new Error();
      const timestamp = Date.now();
      savePendingLogin({ email: email.trim(), sentAt: timestamp });
      setEmail(email.trim()); setSent(true); setSentAt(timestamp); setCooldown(60);
    } catch { setError('Nie udało się wysłać kodu. Sprawdź adres e-mail i spróbuj za chwilę.'); }
    finally { setBusy(false); }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await client.auth.signIn.emailOtp({ email: email.trim(), otp: otp.trim() });
      if (result.error) throw new Error();
      clearPendingLogin();
      setOtp('');
    } catch { setError('Kod jest nieprawidłowy lub wygasł. Sprawdź wiadomość albo poproś o nowy kod.'); }
    finally { setBusy(false); }
  }

  return <AuthShell>
    <p className="eyebrow">DOSTĘP DO NOTATNIKA</p>
    <div className="auth-methods" role="group" aria-label="Sposób logowania">
      <button type="button" aria-pressed={passwordMode} disabled={busy} onClick={() => setPasswordMode(true)}><LockKeyhole size={18} />Hasło</button>
      <button type="button" aria-pressed={!passwordMode} disabled={busy} onClick={() => setPasswordMode(false)}><Mail size={18} />Kod z e-maila</button>
    </div>
    {passwordMode ? <PasswordForm client={client} initialEmail={email} onEmailChange={value => { if (!sent) setEmail(value); }} embedded onBack={() => setPasswordMode(false)} /> : <>
    <h2>{sent ? 'Sprawdź skrzynkę' : 'Zaloguj się'}</h2>
    <p className="auth-caption">{sent ? <>Kod logowania został wysłany na <strong>{email}</strong>. Wpisz go poniżej.</> : 'Wpisz adres e-mail. Otrzymasz kod, którym otworzysz notatnik na dowolnym urządzeniu.'}</p>
    <form onSubmit={sent ? verifyCode : sendCode} className="auth-form">
      {!sent ? <label className="field">Adres e-mail<input autoComplete="email" inputMode="email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="ty@example.com" disabled={busy} /></label> :
        <label className="field">Kod z wiadomości<input className="otp-input" autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" disabled={busy} /></label>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className="button button-primary auth-submit" disabled={busy || (!sent && cooldown > 0)} type="submit">{busy ? 'Chwileczkę…' : sent ? 'Otwórz notatnik' : 'Wyślij kod logowania'}<ArrowRight size={18} /></button>
    </form>
    {sent && <div className="auth-secondary-actions">
      <button className="auth-text-button" disabled={busy} onClick={() => { clearPendingLogin(); setSent(false); setError(''); setOtp(''); setSentAt(0); setCooldown(0); }}><ArrowLeft size={14} /> Zmień adres</button>
      <button className="auth-text-button" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>{cooldown > 0 ? `Wyślij ponownie za ${cooldown} s` : 'Wyślij nowy kod'}</button>
    </div>}
    </>}
    <p className="auth-first-login">Pierwszy raz? Wybierz <button type="button" disabled={busy} onClick={() => setPasswordMode(false)}>Kod z e-maila</button>, aby utworzyć konto i potwierdzić adres. Hasło możesz ustawić później.</p>
    <p className="auth-privacy"><ShieldCheck size={17} /> Dostęp do wpisów mają tylko zatwierdzone konta.</p>
  </AuthShell>;
}

function SignedIn({ client, ownerId, userName, email }: { client: AppNeonClient; ownerId: string; userName?: string; email?: string }) {
  const [access, setAccess] = useState<boolean | null>(null);
  const [passwordSettings, setPasswordSettings] = useState(false);
  const [notebookOwnerId, setNotebookOwnerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const repository = useMemo(() => notebookOwnerId ? createCloudRepository(client, notebookOwnerId) : null, [client, notebookOwnerId]);
  useEffect(() => {
    let cancelled = false;
    setAccess(null); setNotebookOwnerId(null); setError('');
    getNotebookOwnerId(client).then(value => { if (!cancelled) { setNotebookOwnerId(value); setAccess(value !== null); } }).catch(() => {
      if (!cancelled) setError('Nie udało się sprawdzić dostępu. Sprawdź połączenie i spróbuj ponownie.');
    });
    return () => { cancelled = true; };
  }, [client, ownerId, revision]);

  async function signOut() {
    setSigningOut(true);
    try {
      const result = await client.auth.signOut();
      if (result.error) throw new Error('Nie udało się wylogować. Spróbuj ponownie.');
    } finally { setSigningOut(false); }
  }

  if (access && passwordSettings) return <AuthShell><PasswordForm client={client} initialEmail={email} setup onBack={() => setPasswordSettings(false)} /></AuthShell>;
  if (access && repository) return <Notebook draftScope={ownerId} onManagePassword={() => setPasswordSettings(true)} key={ownerId} repository={repository} mode="cloud" userName={userName || email?.split('@')[0]} onSignOut={signOut} />;
  return <AuthShell>
    <div className="auth-card-icon"><LockKeyhole size={25} /></div>
    <p className="eyebrow">PRYWATNY NOTATNIK</p>
    <h2>{access === false ? 'Brak dostępu' : error ? 'Spróbuj ponownie' : 'Otwieranie notatnika…'}</h2>
    {access === false && <>
      <p className="auth-caption">Zalogowano jako <strong>{email}</strong>. Ten adres nie ma dostępu do tego notatnika.</p>
      <p className="auth-caption">Zaloguj się adresem przypisanym do notatnika. Dostęp dla zaproszonego konta jest aktywowany automatycznie po potwierdzeniu adresu kodem z e-maila.</p>
    </>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {(access === false || error) && <button className="button button-primary auth-submit" onClick={() => setRevision(x => x + 1)}><RefreshCw size={17} /> Sprawdź dostęp ponownie</button>}
    <button className="auth-text-button auth-sign-out" disabled={signingOut} onClick={() => void signOut().catch(() => setError('Nie udało się wylogować. Spróbuj ponownie.'))}>{signingOut ? 'Wylogowywanie…' : 'Wyloguj się'}</button>
  </AuthShell>;
}

export function ConnectedApp({ client }: { client: AppNeonClient }) {
  const session = client.auth.useSession();
  const [sessionChecked, setSessionChecked] = useState(false);
  useEffect(() => {
    if (!session.isPending && !session.error) setSessionChecked(true);
    if (session.data?.user) clearPendingLogin();
  }, [session.isPending, session.error, session.data?.user]);
  // Background session checks must not unmount an in-progress email-code form.
  if (session.isPending && !sessionChecked) return <AuthShell><p className="eyebrow">CHWILECZKĘ</p><h2>Sprawdzanie sesji…</h2><p className="auth-caption" role="status">Notatnik będzie gotowy za chwilę.</p></AuthShell>;
  if (session.error && !sessionChecked) return <AuthShell><h2>Brak połączenia</h2><p className="auth-caption" role="alert">Sprawdź połączenie z internetem i spróbuj ponownie.</p><button className="button button-primary" onClick={() => window.location.reload()}>Spróbuj ponownie</button></AuthShell>;
  if (!session.data?.user) return <Login client={client} />;
  const { user } = session.data;
  return <SignedIn key={user.id} client={client} ownerId={user.id} userName={user.name} email={user.email} />;
}

export default function App() {
  const [demo, setDemo] = useState(import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo'));
  const repository = useMemo(() => createDemoRepository(), []);
  if (demo && import.meta.env.DEV) return <Notebook repository={repository} mode="demo" onSignOut={async () => { setDemo(false); window.history.replaceState(null, '', window.location.pathname); }} />;
  if (neonClient) return <ConnectedApp client={neonClient} />;
  return <AuthShell>
    <div className="auth-card-icon"><Utensils size={25} /></div>
    <p className="eyebrow">TWÓJ NOTATNIK SMAKÓW</p>
    <h2>Smaki warte<br />zapamiętania.</h2>
    <p className="auth-caption">Trwa przygotowanie połączenia. Gdy będzie gotowe, zapiszesz tutaj preferencje żywieniowe.</p>
    {import.meta.env.DEV && <><button className="button button-primary auth-submit" onClick={() => setDemo(true)}>Otwórz podgląd lokalny<ArrowRight size={18} /></button><p className="auth-privacy">Wpisy z podglądu pozostają w tej przeglądarce i nie są synchronizowane.</p></>}
  </AuthShell>;
}
