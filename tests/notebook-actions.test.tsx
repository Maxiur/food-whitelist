// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import Notebook from '../src/components/Notebook';
import UndoNotice from '../src/components/UndoNotice';
import { createDemoRepository } from '../src/lib/repository';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
HTMLDialogElement.prototype.showModal = function () { this.open = true; };
HTMLDialogElement.prototype.close = function () { this.open = false; };

it('pins entries and independently undoes two deletions without changing their identities', async () => {
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  let stored: string | null = null, id = 0;
  const repository = createDemoRepository({ storage: { getItem: () => stored, setItem: (_, value) => { stored = value; } }, makeId: () => `${++id}` });
  const one = await repository.create({ name: 'Zupa', preference: 'like', kind: 'dish', category: 'Meals', notes: '' });
  const two = await repository.create({ name: 'Ramen', preference: 'like', kind: 'dish', category: 'Meals', notes: '' });
  const click = async (label: string) => act(async () => {
    const button = [...element.querySelectorAll('button')].find(value => value.getAttribute('aria-label') === label || value.textContent === label);
    expect(button).toBeTruthy(); button!.click();
  });
  try {
    await act(async () => root.render(<Notebook repository={repository} mode="demo" />));
    await click('Przypnij: Zupa');
    expect(element.querySelector('.food-card h3')?.textContent).toBe('Zupa');
    await click('Usuń: Zupa'); await click('Usuń wpis');
    await click('Usuń: Ramen'); await click('Usuń wpis');
    expect(await repository.list()).toHaveLength(0);
    expect(element.querySelectorAll('.undo-notice')).toHaveLength(2);
    await click('Cofnij usunięcie: Zupa');
    await click('Cofnij usunięcie: Ramen');
    expect((await repository.list()).map(value => value.id).sort()).toEqual([one.id, two.id].sort());
    expect((await repository.list()).find(value => value.id === one.id)?.pinned).toBe(true);
    await click('Wylosuj danie');
    expect(element.querySelector('.random-result h3')?.textContent).toMatch(/Zupa|Ramen/);
  } finally { await act(async () => root.unmount()); element.remove(); }
});

it('expires undo after 15 seconds but never dismisses a request while it is in flight', async () => {
  vi.useFakeTimers();
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  const dismiss = vi.fn();
  let finish!: () => void;
  const undo = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  try {
    await act(async () => root.render(<UndoNotice item={{ id: '1', name: 'Entry', expiresAt: Date.now() + 15_000 }} onDismiss={dismiss} onUndo={undo} />));
    await act(async () => vi.advanceTimersByTime(14_000));
    expect(dismiss).not.toHaveBeenCalled();
    await act(async () => element.querySelector<HTMLButtonElement>('.undo-button')!.click());
    await act(async () => vi.advanceTimersByTime(5_000));
    expect(dismiss).not.toHaveBeenCalled();
    await act(async () => finish());
    expect(dismiss).toHaveBeenCalledWith('1');
    dismiss.mockClear();
    await act(async () => root.render(<UndoNotice key="second" item={{ id: '2', name: 'Another', expiresAt: Date.now() + 15_000 }} onDismiss={dismiss} onUndo={undo} />));
    await act(async () => vi.advanceTimersByTime(15_000));
    expect(dismiss).toHaveBeenCalledWith('2');
  } finally { await act(async () => root.unmount()); element.remove(); vi.useRealTimers(); }
});
