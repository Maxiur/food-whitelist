// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectedApp } from '../src/App';
import type { AppNeonClient } from '../src/lib/neon';
import { readPendingLogin, savePendingLogin } from '../src/lib/pending-login';

vi.mock('../src/lib/neon', () => ({ neonClient: null }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
let session = { isPending: false, error: null, data: null };
const send = vi.fn();
const verify = vi.fn();
const client = { auth: {
  useSession: () => session,
  emailOtp: { sendVerificationOtp: send },
  signIn: { emailOtp: verify },
} } as unknown as AppNeonClient;

async function mount() {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<ConnectedApp client={client} />));
}
async function fill(selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(selector)!;
  expect(input).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() {
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
async function requestCode() {
  await fill('input[type=email]', 'tester@example.com');
  await submit();
  expect(container.querySelector('.otp-input')).not.toBeNull();
}
beforeEach(async () => {
  window.sessionStorage.clear();
  session = { isPending: false, error: null, data: null };
  send.mockReset().mockResolvedValue({ error: null });
  verify.mockReset().mockResolvedValue({ error: null });
  await mount();
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('email-code login recovery', () => {
  it('keeps the same form and entered code during a background session refresh', async () => {
    await requestCode();
    await fill('.otp-input', '123456');
    const input = container.querySelector('.otp-input');
    session = { ...session, isPending: true };
    await act(async () => root.render(<ConnectedApp client={client} />));
    expect(container.querySelector('.otp-input')).toBe(input);
    expect((input as HTMLInputElement).value).toBe('123456');
    session = { ...session, isPending: false };
    await act(async () => root.render(<ConnectedApp client={client} />));
    expect(container.querySelector('.otp-input')).toBe(input);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('restores the email-code step after a page remount without storing the code or resending email', async () => {
    await requestCode();
    await fill('.otp-input', '123456');
    await act(async () => root.unmount());
    container.remove();
    await mount();
    expect(container.textContent).toContain('tester@example.com');
    expect(container.querySelector<HTMLInputElement>('.otp-input')?.value).toBe('');
    expect(send).toHaveBeenCalledTimes(1);
    const stored = window.sessionStorage.getItem(window.sessionStorage.key(0)!);
    expect(stored).not.toContain('123456');
    expect(Object.keys(JSON.parse(stored!)).sort()).toEqual(['email', 'sentAt']);
  });

  it('uses elapsed time when returning from a suspended tab', async () => {
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    await requestCode();
    now += 61_000;
    await act(async () => window.dispatchEvent(new Event('focus')));
    const resend = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Wyślij nowy kod');
    expect(resend?.disabled).toBe(false);
  });

  it('clears the pending record after successful verification', async () => {
    await requestCode();
    await fill('.otp-input', '123456');
    await submit();
    expect(verify).toHaveBeenCalledWith({ email: 'tester@example.com', otp: '123456' });
    expect(readPendingLogin()).toBeNull();
  });

  it('clears pending state when changing the email', async () => {
    await requestCode();
    const change = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Zmień adres'))!;
    await act(async () => change.click());
    expect(readPendingLogin()).toBeNull();
    expect(container.querySelector('input[type=email]')).not.toBeNull();
  });

  it('does not restore stale, future-dated or malformed pending records', () => {
    const now = Date.now();
    for (const sentAt of [now - 16 * 60_000, now + 60_000]) {
      savePendingLogin({ email: 'tester@example.com', sentAt });
      expect(readPendingLogin(now)).toBeNull();
    }
    window.sessionStorage.setItem('food-whitelist:pending-login:v1', '{broken');
    expect(readPendingLogin(now)).toBeNull();
  });

  it('does not advance after a failed code request', async () => {
    send.mockResolvedValue({ error: { message: 'Rejected' } });
    await fill('input[type=email]', 'tester@example.com');
    await submit();
    expect(container.querySelector('.otp-input')).toBeNull();
    expect(readPendingLogin()).toBeNull();
  });
});
