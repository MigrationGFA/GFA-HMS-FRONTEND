import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

export type PharmacySettings = {
  settingsId: number;
  defaultReorderLevel: number;
  expiringSoonDays: number;
  expiryCriticalDays: number;
  expiryWarningDays: number;
  receiveStockWarnDays: number;
  recentlyReceivedDays: number;
  controlledRequiresWitness: boolean;
  lowStockAlertEnabled: boolean;
  expiryAlertEnabled: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type UpdatePharmacySettingsPayload = Partial<{
  defaultReorderLevel: number;
  expiringSoonDays: number;
  expiryCriticalDays: number;
  expiryWarningDays: number;
  receiveStockWarnDays: number;
  recentlyReceivedDays: number;
  controlledRequiresWitness: boolean;
  lowStockAlertEnabled: boolean;
  expiryAlertEnabled: boolean;
}>;

export function isPharmacySettingsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function getPharmacySettings(): Promise<PharmacySettings> {
  const body = await apiRequest<ApiEnvelope<PharmacySettings>>(
    '/api/pharmacy/settings',
  );
  return body.data;
}

export async function updatePharmacySettings(
  payload: UpdatePharmacySettingsPayload,
): Promise<PharmacySettings> {
  const body = await apiRequest<ApiEnvelope<PharmacySettings>>(
    '/api/pharmacy/settings',
    { method: 'PATCH', body: payload },
  );
  return body.data;
}
