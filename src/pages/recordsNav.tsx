import {
  LayoutDashboard, UserPlus, Calendar, Users, Activity, Flag,
  ClipboardList, FileCheck, FileText, FolderOpen, Archive, Send,
  ClipboardCheck, TrendingUp, History, RefreshCw, UserCog, MessageSquare,
} from 'lucide-react';

export const recordsNav = [
  { label: 'Dashboard / Overview', path: '/dashboard/records', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Patient Entry Engine', path: '/hms/identity', icon: <UserPlus className="h-4 w-4" /> },
  { label: 'Appointment Check-In', path: '/records/checkin', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Patient Arrival', path: '/records/arrivals', icon: <Users className="h-4 w-4" /> },
  { label: 'Triage Queue', path: '/records/triage', icon: <Activity className="h-4 w-4" /> },
  { label: 'Patient Directory', path: '/records/directory', icon: <Users className="h-4 w-4" /> },
  { label: 'Duplicate Patient Mgmt', path: '/records/duplicates', icon: <Flag className="h-4 w-4" /> },
  { label: 'Admission Requests', path: '/records/admissions', icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Patient Transfers', path: '/records/transfers', icon: <Send className="h-4 w-4" /> },
  { label: 'Discharge Processing', path: '/records/discharge', icon: <FileCheck className="h-4 w-4" /> },
  { label: 'Document Management', path: '/records/documents', icon: <FileText className="h-4 w-4" /> },
  { label: 'Medical Record Retrieval', path: '/records/retrieval', icon: <FolderOpen className="h-4 w-4" /> },
  { label: 'Record Archive', path: '/records/archive', icon: <Archive className="h-4 w-4" /> },
  { label: 'Internal & External Referrals', path: '/records/referrals', icon: <Send className="h-4 w-4" /> },
  { label: 'Communication Center', path: '/records/comms', icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Reports', path: '/records/reports', icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'Records Analytics', path: '/records/analytics', icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'Audit Trail', path: '/records/audit', icon: <History className="h-4 w-4" /> },
  { label: 'My Profile', path: '/records/profile', icon: <UserCog className="h-4 w-4" /> },
  { label: 'Sync Queue', path: '/records/sync-queue', icon: <RefreshCw className="h-4 w-4" /> },
  { label: 'EMR Sync Overview', path: '/records/sync', icon: <RefreshCw className="h-4 w-4" /> },
];
