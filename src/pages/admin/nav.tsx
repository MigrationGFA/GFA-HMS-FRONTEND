import {
  Activity, BedDouble, Bell, Building2, ClipboardList, DollarSign, FileText,
  Package, Settings, Stethoscope, UserCog, Users, Wallet, Wrench, Brain,
} from 'lucide-react';

export const adminNav = [
  { label: 'Dashboard', path: '/dashboard/admin', icon: <Activity className="h-4 w-4" />, group: 'Overview' },
  { label: 'Departments', path: '/dashboard/admin/departments', icon: <Building2 className="h-4 w-4" />, group: 'Hospital operations' },
  { label: 'Patient flow', path: '/dashboard/admin/operations', icon: <Users className="h-4 w-4" />, group: 'Hospital operations' },
  { label: 'Admissions and beds', path: '/dashboard/admin/operations?view=beds', icon: <BedDouble className="h-4 w-4" />, group: 'Hospital operations' },
  { label: 'Revenue', path: '/dashboard/admin/finance', icon: <DollarSign className="h-4 w-4" />, group: 'Finance' },
  { label: 'Invoices and collections', path: '/dashboard/admin/invoices', icon: <FileText className="h-4 w-4" />, group: 'Finance' },
  { label: 'Outstanding balances', path: '/dashboard/admin/finance?status=outstanding', icon: <Wallet className="h-4 w-4" />, group: 'Finance' },
  { label: 'Services and pricing', path: '/dashboard/admin/services', icon: <Package className="h-4 w-4" />, group: 'Administration' },
  { label: 'Staff and duty rosters', path: '/dashboard/admin/staff', icon: <UserCog className="h-4 w-4" />, group: 'Administration' },
  { label: 'Department reports', path: '/dashboard/admin/reports', icon: <ClipboardList className="h-4 w-4" />, group: 'Administration' },
  { label: 'Inventory and availability', path: '/dashboard/admin/inventory', icon: <Wrench className="h-4 w-4" />, group: 'Administration' },
  { label: 'Administrative settings', path: '/dashboard/admin/settings', icon: <Settings className="h-4 w-4" />, group: 'Configuration' },
  { label: 'Approvals', path: '/dashboard/admin/settings?view=prices', icon: <Bell className="h-4 w-4" />, group: 'Configuration' },
  { label: 'Service packages', path: '/dashboard/admin/packages', icon: <Stethoscope className="h-4 w-4" />, group: 'Configuration' },
  { label: 'AI insights', path: '/dashboard/admin/insights', icon: <Brain className="h-4 w-4" />, group: 'Configuration' },
];
