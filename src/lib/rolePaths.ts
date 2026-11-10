import type { UserRole } from '@/data/dummyData';

/** Post-login / "home" route for each role (canonical dashboard entry). */
export function getRoleHomePath(role: UserRole): string {
  switch (role) {
    case 'lab':
      return '/dashboard/laboratory';
    case 'doctor':
      return '/dashboard/doctor/clinical';
    case 'cashier':
      return '/dashboard/cashier';
    case 'pharmacist':
      return '/pharmacy';
    case 'dental':
      return '/dashboard/dental';
    case 'eye':
      return '/dashboard/eye';
    case 'paeds':
      return '/dashboard/paeds';
    default:
      return `/dashboard/${role}`;
  }
}
