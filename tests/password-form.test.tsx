// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import PasswordForm from '../src/components/PasswordForm';
import type { AppNeonClient } from '../src/lib/neon';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('requires matching passwords and sends the reset OTP and password only to Auth', async () => {
  const send = vi.fn().mockResolvedValue({ error: null });
  const reset = vi.fn().mockResolvedValue({ error: null });
  const client = { auth: { forgetPassword: { emailOtp: send }, emailOtp: { resetPassword: reset } } } as unknown as AppNeonClient;
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  const fill = async (index: number, value: string) => act(async () => {
    const input = element.querySelectorAll('input')[index];
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const submit = async () => act(async () => { element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  try {
    await act(async () => root.render(<PasswordForm client={client} initialEmail="test@example.com" setup onBack={() => {}} />));
    await submit();
    expect(send).toHaveBeenCalledWith({ email: 'test@example.com' });
    await fill(1, '123456'); await fill(2, 'long-test-password'); await fill(3, 'different-password');
    await submit(); expect(reset).not.toHaveBeenCalled();
    await fill(3, 'long-test-password'); await submit();
    expect(reset).toHaveBeenCalledWith({ email: 'test@example.com', otp: '123456', password: 'long-test-password' });
    expect(element.textContent).toContain('Hasło zapisane');
    expect(element.querySelector('input[type=password]')).toBeNull();
    expect(JSON.stringify(window.sessionStorage)).not.toContain('long-test-password');
    expect(JSON.stringify(window.localStorage)).not.toContain('long-test-password');
  } finally { await act(async () => root.unmount()); element.remove(); }
});
