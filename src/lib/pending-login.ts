const STORAGE_KEY = 'food-whitelist:pending-login:v1';
const RESUME_WINDOW_MS = 15 * 60 * 1000;
export interface PendingLogin { email: string; sentAt: number }

// This restores UI state only. The auth service still validates and expires OTPs.
// Never store the OTP, tokens or credentials in this record.
export function readPendingLogin(now = Date.now()): PendingLogin | null {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (value && typeof value.email === 'string' && value.email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) &&
        typeof value.sentAt === 'number' && Number.isFinite(value.sentAt) &&
        value.sentAt <= now && now - value.sentAt < RESUME_WINDOW_MS) {
      return { email: value.email, sentAt: value.sentAt };
    }
    clearPendingLogin();
  } catch { /* Storage can be disabled; in-memory sign-in still works. */ }
  return null;
}

export function savePendingLogin(value: PendingLogin) {
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ email: value.email, sentAt: value.sentAt })); }
  catch { /* Do not turn a successful code request into a login error. */ }
}

export function clearPendingLogin() {
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
}

export function resendCooldown(sentAt: number, now = Date.now()) {
  return Math.max(0, Math.min(60, Math.ceil((sentAt + 60_000 - now) / 1000)));
}
