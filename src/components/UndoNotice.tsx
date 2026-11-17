import { useEffect, useState } from 'react';
import { Undo2, X } from 'lucide-react';

export interface UndoItem { id: string; name: string; expiresAt: number }
export default function UndoNotice({ item, onUndo, onDismiss }: {
  item: UndoItem; onUndo: (id: string) => Promise<void>; onDismiss: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (busy || error) return;
    const timer = window.setTimeout(() => onDismiss(item.id), Math.max(0, item.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [item, busy, error, onDismiss]);
  async function undo() {
    if (busy) return;
    setBusy(true); setError('');
    try { await onUndo(item.id); onDismiss(item.id); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Nie udało się przywrócić wpisu.'); }
    finally { setBusy(false); }
  }
  return <div className="undo-notice"><div><span role="status">Usunięto „{item.name}”.</span>{error && <p role="alert">{error}</p>}</div><button type="button" className="undo-button" disabled={busy} onClick={() => void undo()} aria-label={`Cofnij usunięcie: ${item.name}`}><Undo2 size={16} />{busy ? 'Przywracanie…' : 'Cofnij'}</button><button type="button" className="icon-button" disabled={busy} aria-label={`Zamknij cofanie: ${item.name}`} onClick={() => onDismiss(item.id)}><X size={16} /></button></div>;
}
