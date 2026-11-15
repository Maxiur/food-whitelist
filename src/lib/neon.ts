import { createClient } from '@neondatabase/neon-js';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

function publicEndpoint(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    // Browser configuration must never accept a database connection string.
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

const authUrl = publicEndpoint(import.meta.env.VITE_NEON_AUTH_URL);
const dataUrl = publicEndpoint(import.meta.env.VITE_NEON_DATA_API_URL);

function makeClient(auth: string, data: string) {
  return createClient({
    auth: { url: auth, adapter: BetterAuthReactAdapter(), allowAnonymous: false },
    dataApi: { url: data },
  });
}

export type AppNeonClient = ReturnType<typeof makeClient>;
export const isNeonConfigured = Boolean(authUrl && dataUrl);
export const neonClient = authUrl && dataUrl ? makeClient(authUrl, dataUrl) : null;
