import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

export type UserProfile = {
  userId: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNo: string | null;
  licenseNumber: string | null;
  specialties: string | null;
  subSpecialty: string | null;
  qualifications: string | null;
  departmentName: string | null;
  clinicName: string | null;
  consultationHours: string | null;
  wardAssignment: string | null;
  roles: string[];
};

export type UpdateProfilePayload = Partial<{
  firstName: string;
  lastName: string;
  licenseNumber: string;
  specialties: string;
  subSpecialty: string;
  qualifications: string;
  departmentName: string;
  clinicName: string;
  consultationHours: string;
  wardAssignment: string;
  phoneNo: string;
}>;

export function isUsersApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function getMyProfile(): Promise<UserProfile> {
  const body = await apiRequest<ApiEnvelope<UserProfile>>('/api/users/me');
  return body.data;
}

export async function updateMyProfile(
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const body = await apiRequest<ApiEnvelope<UserProfile>>('/api/users/me', {
    method: 'PATCH',
    body: payload,
  });
  return body.data;
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean }> {
  const body = await apiRequest<ApiEnvelope<{ success: boolean }>>(
    '/api/auth/change-password',
    { method: 'POST', body: payload },
  );
  return body.data;
}
