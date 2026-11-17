// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import SharingPanel from '../src/components/SharingPanel';
import type { SharingRepository } from '../src/lib/types';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('saves an exact email invitation, explains link delivery, and confirms revocation', async () => {
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  const get = vi.fn().mockResolvedValue({ role: 'owner', email: null, status: 'empty', legacyMember: false });
  const repository: SharingRepository = { get, invite: vi.fn().mockResolvedValue(undefined), revoke: vi.fn().mockResolvedValue(undefined) };
  const button = (text: string) => [...element.querySelectorAll('button')].find(value => value.textContent === text)!;
  try {
    await act(async () => root.render(<SharingPanel repository={repository} />));
    await act(async () => {
      const input = element.querySelector('input')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'member@example.com');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    get.mockResolvedValue({ role: 'owner', email: 'member@example.com', status: 'pending', legacyMember: false });
    await act(async () => element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(repository.invite).toHaveBeenCalledWith('member@example.com');
    expect(element.textContent).toContain('nie jest wysyłana automatycznie');
    expect(element.querySelector<HTMLInputElement>('input')?.readOnly).toBe(true);
    await act(async () => button('Anuluj zaproszenie').click());
    expect(repository.revoke).not.toHaveBeenCalled();
    get.mockResolvedValue({ role: 'owner', email: null, status: 'empty', legacyMember: false });
    await act(async () => button('Tak, cofnij dostęp').click());
    expect(repository.revoke).toHaveBeenCalledWith('member@example.com');
    expect(element.textContent).toContain('Dostęp cofnięty');
  } finally { await act(async () => root.unmount()); element.remove(); }
});

it('offers no invitation controls to a member and shows failures without claiming success', async () => {
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  const repository: SharingRepository = { get: vi.fn().mockResolvedValue({ role: 'member' }), invite: vi.fn(), revoke: vi.fn() };
  try {
    await act(async () => root.render(<SharingPanel repository={repository} />));
    expect(element.querySelector('form')).toBeNull();
    expect(element.textContent).toContain('zarządza właściciel');
    const failed = { ...repository, get: vi.fn().mockRejectedValue(new Error('Połączenie niedostępne')) };
    await act(async () => root.render(<SharingPanel repository={failed} />));
    expect(element.querySelector('[role=alert]')?.textContent).toContain('Połączenie niedostępne');
    expect(element.querySelector('form')).toBeNull();
  } finally { await act(async () => root.unmount()); element.remove(); }
});
