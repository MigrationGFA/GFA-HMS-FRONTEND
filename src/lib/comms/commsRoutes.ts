import type { UserRole } from '@/data/dummyData';
import type { ChatModuleId } from '@/lib/api/chat';

const ROLE_TO_COMMS_PATH: Partial<Record<UserRole, string>> = {
  doctor: '/dashboard/doctor/clinical/comms',
  nurse: '/dashboard/nurse/comms',
  lab: '/dashboard/laboratory/comms',
  pharmacist: '/dashboard/pharmacy/comms',
  cashier: '/dashboard/cashier/comms',
  records: '/records/comms',
  cmd: '/records/comms',
  superadmin: '/dashboard/doctor/clinical/comms',
  admin: '/dashboard/doctor/clinical/comms',
  it: '/dashboard/doctor/clinical/comms',
};

const MODULE_TO_COMMS_PATH: Record<ChatModuleId, string> = {
  doctor: '/dashboard/doctor/clinical/comms',
  laboratory: '/dashboard/laboratory/comms',
  pharmacy: '/dashboard/pharmacy/comms',
  cashier: '/dashboard/cashier/comms',
  records: '/records/comms',
};

export function commsPathForRole(role?: UserRole | string | null): string {
  if (!role) return '/dashboard/doctor/clinical/comms';
  return ROLE_TO_COMMS_PATH[role as UserRole] ?? '/dashboard/doctor/clinical/comms';
}

export function commsPathForModule(module: ChatModuleId): string {
  return MODULE_TO_COMMS_PATH[module];
}

export function commsPathWithThread(basePath: string, conversationId: string): string {
  const sep = basePath.includes('?') ? '&' : '?';
  return `${basePath}${sep}thread=${encodeURIComponent(conversationId)}`;
}

export function isCommsRoute(pathname: string): boolean {
  return pathname.includes('/comms');
}
