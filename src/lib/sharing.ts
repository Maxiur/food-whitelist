import type { AppNeonClient } from './neon';
import type { SharingRepository, SharingState } from './types';

function sharingError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === '42501') throw new Error('Tylko właściciel notatnika może zarządzać zaproszeniem.');
  if (error.code === '22023') throw new Error('Wpisz poprawny adres drugiej osoby, inny niż Twój.');
  if (error.code === '23505' || error.code === 'P0002') throw new Error('Dostęp zmienił się na innym urządzeniu. Odśwież ustawienia.');
  throw new Error('Nie udało się zapisać lub sprawdzić dostępu. Spróbuj ponownie.');
}
export function createSharingRepository(client: AppNeonClient): SharingRepository {
  return {
    async get(): Promise<SharingState> {
      const { data, error } = await client.rpc('get_notebook_sharing');
      sharingError(error);
      if (data?.role === 'member') return { role: 'member' };
      if (data?.role !== 'owner' || !(data.email === null || typeof data.email === 'string') ||
        !['empty', 'pending', 'active'].includes(data.status) || typeof data.legacyMember !== 'boolean') {
        throw new Error('Nie udało się odczytać ustawień dostępu.');
      }
      return { role: 'owner', email: data.email, status: data.status, legacyMember: data.legacyMember };
    },
    async invite(email) { const { error } = await client.rpc('invite_notebook_member', { member_email: email.trim() }); sharingError(error); },
    async revoke(email) { const { error } = await client.rpc('revoke_notebook_member', { expected_email: email }); sharingError(error); },
  };
}
