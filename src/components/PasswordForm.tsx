import { useState, type FormEvent } from 'react';
import type { AppNeonClient } from '../lib/neon';

export default function PasswordForm({ client, initialEmail = '', setup = false, onBack }: { client: AppNeonClient; initialEmail?: string; setup?: boolean; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [reset, setReset] = useState(setup);
  const [sent, setSent] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setError('');
    if (reset && sent && (password.length < 12 || password.length > 128 || password !== confirm)) {
      setError('Hasło musi mieć 12–128 znaków, a oba pola muszą być identyczne.'); return;
    }
    setBusy(true);
    try {
      if (reset && !sent) {
        const result = await client.auth.forgetPassword.emailOtp({ email: email.trim() });
        if (result.error) throw new Error();
        setSent(true);
      } else if (reset) {
        const result = await client.auth.emailOtp.resetPassword({ email: email.trim(), otp, password });
        if (result.error) throw new Error();
        setPassword(''); setConfirm(''); setOtp(''); setDone(true);
      } else {
        const result = await client.auth.signIn.email({ email: email.trim(), password, rememberMe: true });
        if (result.error) throw new Error();
        setPassword('');
      }
    } catch { setError(reset ? 'Nie udało się wykonać operacji. Sprawdź kod i spróbuj ponownie. Jeśli wygasł, wróć i poproś o nowy.' : 'Nie udało się zalogować. Sprawdź e-mail i hasło albo użyj kodu z poczty.'); }
    finally { setBusy(false); }
  }
  if (done) return <><h2>Hasło zapisane</h2><p className="auth-caption">Przy kolejnym logowaniu użyj adresu e-mail i hasła. Kod z poczty pozostaje opcją odzyskania dostępu.</p><button className="button button-primary" onClick={onBack}>Gotowe</button></>;
  return <>
    <h2>{reset ? 'Ustaw lub zmień hasło' : 'Zaloguj się hasłem'}</h2>
    <p className="auth-caption">{reset ? sent ? 'Wpisz kod do ustawienia hasła z wiadomości oraz nowe hasło.' : 'Jednorazowo potwierdź zmianę kodem z e-maila. Później zalogujesz się samym hasłem.' : 'Użyj swojego adresu e-mail i ustawionego wcześniej hasła.'}</p>
    <form className="auth-form" onSubmit={submit}>
      <label className="field">Adres e-mail<input type="email" autoComplete="username" required value={email} disabled={busy || sent || !!initialEmail} onChange={e => setEmail(e.target.value)} /></label>
      {reset && sent && <label className="field">Kod do ustawienia hasła<input required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" value={otp} disabled={busy} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} /></label>}
      {(!reset || sent) && <label className="field">{reset ? 'Nowe hasło (12–128 znaków)' : 'Hasło'}<input type="password" autoComplete={reset ? 'new-password' : 'current-password'} required minLength={reset ? 12 : 1} maxLength={128} value={password} disabled={busy} onChange={e => setPassword(e.target.value)} /></label>}
      {reset && sent && <label className="field">Powtórz hasło<input type="password" autoComplete="new-password" required value={confirm} maxLength={128} disabled={busy} onChange={e => setConfirm(e.target.value)} /></label>}
      {error && <p role="alert" className="error-message">{error}</p>}
      <button className="button button-primary" disabled={busy}>{busy ? 'Chwileczkę…' : reset ? sent ? 'Zapisz hasło' : 'Wyślij kod do ustawienia hasła' : 'Zaloguj się'}</button>
    </form>
    {!reset && <button className="auth-text-button" disabled={busy} onClick={() => { setReset(true); setPassword(''); setError(''); }}>Nie mam hasła / Nie pamiętam hasła</button>}
    <button className="auth-text-button" disabled={busy} onClick={onBack}>Wróć</button>
  </>;
}
