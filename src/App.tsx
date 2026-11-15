import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Heart, LockKeyhole, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import Notebook from './components/Notebook';
import { neonClient, type AppNeonClient } from './lib/neon';
import { createCloudRepository, createDemoRepository, hasNotebookAccess } from './lib/repository';
import './auth.css';

function AuthShell({ children }: { children: ReactNode }) {
  return <main className="auth-page">
    <a className="auth-brand" href="./" aria-label="Food Whitelist — home"><span><Heart size={22} /></span> Food Whitelist<span className="auth-brand-dot">.</span></a>
    <section className="auth-layout">
      <div className="auth-intro">
        <p className="eyebrow">A LITTLE SPACE FOR GOOD FOOD</p>
        <h1>Good food.<br />Clear preferences.<br /><em>All in one place.</em></h1>
        <p>Favorite flavors, ingredients to avoid, and the little details worth remembering.</p>
        <div className="auth-note"><Heart size={18} /><span>A personal reference for your next meal.</span></div>
      </div>
      <div className="auth-card">{children}</div>
    </section>
    <footer className="auth-footer"><LockKeyhole size={14} /> Your private notebook <span>FOOD WHITELIST · 01</span></footer>
  </main>;
}

function Login({ client }: { client: AppNeonClient }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy || cooldown) return;
    setBusy(true); setError('');
    try {
      const result = await client.auth.emailOtp.sendVerificationOtp({ email: email.trim(), type: 'sign-in' });
      if (result.error) throw new Error();
      setSent(true); setCooldown(60);
    } catch { setError('Could not send a code. Check your email address and try again shortly.'); }
    finally { setBusy(false); }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await client.auth.signIn.emailOtp({ email: email.trim(), otp: otp.trim() });
      if (result.error) throw new Error();
      setOtp('');
    } catch { setError('This code is invalid or has expired. Check your email or request a new code.'); }
    finally { setBusy(false); }
  }

  return <AuthShell>
    <div className="auth-card-icon"><Mail size={25} /></div>
    <p className="eyebrow">YOUR PRIVATE SPACE</p>
    <h2>{sent ? 'Check your inbox' : 'Welcome back'}</h2>
    <p className="auth-caption">{sent ? <>Your sign-in code was sent to <strong>{email}</strong>. Enter it below.</> : 'Sign in with an email code. Keep your food notes together, on every device.'}</p>
    <form onSubmit={sent ? verifyCode : sendCode} className="auth-form">
      {!sent ? <label className="field">Email address<input autoComplete="email" inputMode="email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" disabled={busy} /></label> :
        <label className="field">Email code<input className="otp-input" autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" disabled={busy} /></label>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className="button button-primary auth-submit" disabled={busy || (!sent && cooldown > 0)} type="submit">{busy ? 'One moment…' : sent ? 'Open notebook' : 'Send sign-in code'}<ArrowRight size={18} /></button>
    </form>
    {sent && <div className="auth-secondary-actions">
      <button className="auth-text-button" disabled={busy} onClick={() => { setSent(false); setError(''); setOtp(''); setCooldown(0); }}><ArrowLeft size={14} /> Change email</button>
      <button className="auth-text-button" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>{cooldown > 0 ? `Resend in ${cooldown} s` : 'Send a new code'}</button>
    </div>}
    <p className="auth-privacy"><ShieldCheck size={17} /> Notes are accessible only to the approved owner.</p>
  </AuthShell>;
}

function SignedIn({ client, ownerId, userName, email }: { client: AppNeonClient; ownerId: string; userName?: string; email?: string }) {
  const [access, setAccess] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const repository = useMemo(() => createCloudRepository(client, ownerId), [client, ownerId]);
  useEffect(() => {
    let cancelled = false;
    setAccess(null); setError('');
    hasNotebookAccess(client).then(value => { if (!cancelled) setAccess(value); }).catch(() => {
      if (!cancelled) setError('Could not check access. Check your connection and try again.');
    });
    return () => { cancelled = true; };
  }, [client, ownerId, revision]);

  async function signOut() {
    setSigningOut(true);
    try {
      const result = await client.auth.signOut();
      if (result.error) throw new Error('Could not sign out. Please try again.');
    } finally { setSigningOut(false); }
  }

  if (access) return <Notebook key={ownerId} repository={repository} mode="cloud" userName={userName || email?.split('@')[0]} onSignOut={signOut} />;
  return <AuthShell>
    <div className="auth-card-icon"><LockKeyhole size={25} /></div>
    <p className="eyebrow">PRIVATE NOTEBOOK</p>
    <h2>{access === false ? 'One more step' : error ? 'Please try again' : 'Opening your notebook…'}</h2>
    {access === false && <>
      <p className="auth-caption">Signed in as <strong>{email}</strong>. This account is waiting for access to the notebook.</p>
      <p className="auth-caption">During initial setup, return to your Codex chat and confirm that you have signed in. Creating an account does not grant access to any notes.</p>
    </>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {(access === false || error) && <button className="button button-primary auth-submit" onClick={() => setRevision(x => x + 1)}><RefreshCw size={17} /> Check access again</button>}
    <button className="auth-text-button auth-sign-out" disabled={signingOut} onClick={() => void signOut().catch(() => setError('Could not sign out. Please try again.'))}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
  </AuthShell>;
}

function ConnectedApp({ client }: { client: AppNeonClient }) {
  const session = client.auth.useSession();
  if (session.isPending) return <AuthShell><p className="eyebrow">ONE MOMENT</p><h2>Checking your session…</h2><p className="auth-caption" role="status">Your notebook will be ready in a moment.</p></AuthShell>;
  if (session.error) return <AuthShell><h2>Unable to connect</h2><p className="auth-caption" role="alert">Check your internet connection and try again.</p><button className="button button-primary" onClick={() => window.location.reload()}>Try again</button></AuthShell>;
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
    <div className="auth-card-icon"><Heart size={25} /></div>
    <p className="eyebrow">YOUR FOOD NOTEBOOK</p>
    <h2>Good food.<br />Worth remembering.</h2>
    <p className="auth-caption">The database connection is being prepared. Once it is ready, you can save food preferences here.</p>
    {import.meta.env.DEV && <><button className="button button-primary auth-submit" onClick={() => setDemo(true)}>Open local preview<ArrowRight size={18} /></button><p className="auth-privacy">Preview entries stay in this browser only. They are not synced to the database.</p></>}
  </AuthShell>;
}
