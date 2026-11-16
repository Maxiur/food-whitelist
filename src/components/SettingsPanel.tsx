import { useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowLeft, LockKeyhole } from 'lucide-react';

export default function SettingsPanel({ userName, email, mode, count, canExport, onExport, renderPasswordSettings }: {
  userName?: string; email?: string; mode: 'cloud' | 'demo'; count: number; canExport: boolean;
  onExport: () => void; renderPasswordSettings?: (onBack: () => void) => ReactNode;
}) {
  const [section, setSection] = useState<'overview' | 'password'>('overview');
  if (section === 'password' && renderPasswordSettings) return <div className="settings-password">
    <button className="auth-text-button" type="button" onClick={() => setSection('overview')}><ArrowLeft size={16} />Wróć do ustawień</button>
    {renderPasswordSettings(() => setSection('overview'))}
  </div>;
  return <div className="settings-sections">
    <section><p className="eyebrow">01 / KONTO</p><h3>{userName || 'Twój notatnik'}</h3>{email && <p className="settings-email">{email}</p>}<p>{mode === 'cloud' ? 'Wpisy synchronizują się między urządzeniami. Każda uprawniona osoba loguje się na swoje konto i korzysta ze wspólnej listy.' : 'Podgląd lokalny — dane są zapisane tylko w tej przeglądarce.'}</p></section>
    {renderPasswordSettings && <section><p className="eyebrow">02 / LOGOWANIE</p><h3>Hasło i dostęp</h3><p>Loguj się hasłem lub kodem z e-maila. Ustawienie nowego hasła wymaga kodu potwierdzającego wysłanego na Twój adres.</p><button type="button" className="button button-secondary" onClick={() => setSection('password')}><LockKeyhole size={17} />Ustaw lub zmień hasło</button></section>}
    <section><p className="eyebrow">{renderPasswordSettings ? '03' : '02'} / TWOJE DANE</p><h3>Kopia notatnika</h3><p>Pobierz wszystkie wpisy ({count}) wraz z kategoriami, typem, tagami i notatkami jako plik JSON.</p><button className="button button-secondary" type="button" disabled={!canExport} onClick={onExport}><ArrowDownToLine size={17} />Pobierz kopię danych</button><small>Pobrany plik zawiera prywatne wpisy. Zachowaj go w swoim bezpiecznym miejscu.</small></section>
  </div>;
}
