import {
  LayoutDashboard, ClipboardList, QrCode, Microscope, FilePlus, FileSignature,
  History, Beaker, BarChart3, MessageSquare, ScrollText, Smartphone, CreditCard, Droplets, TestTube2,
  Pill, ShieldAlert, UserPlus, Send, FileEdit, Settings2, BookOpen, Printer, ShieldCheck, Search,
  UserCog,
} from 'lucide-react';

export const labBase = '/dashboard/laboratory';

/** Full laboratory sidebar — use on every `/dashboard/laboratory/*` page. */
export const labCenterNav = [
  { label: 'Lab Dashboard', path: `${labBase}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Unified Request Center', path: `${labBase}/requests`, icon: <Search className="h-4 w-4" /> },
  { label: 'Lab Billing', path: `${labBase}/billing`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Walk-In Workflow', path: `${labBase}/walk-in`, icon: <UserPlus className="h-4 w-4" /> },
  { label: 'Sample Collection', path: `${labBase}/samples`, icon: <QrCode className="h-4 w-4" /> },
  { label: 'Result Entry', path: `${labBase}/results`, icon: <FilePlus className="h-4 w-4" /> },
  { label: 'Result Validation', path: `${labBase}/validation`, icon: <FileSignature className="h-4 w-4" /> },
  { label: 'Result Amendment', path: `${labBase}/amendment`, icon: <FileEdit className="h-4 w-4" /> },
  { label: 'Result Templates', path: `${labBase}/templates`, icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Urine Drug Screening', path: `${labBase}/drug-screen`, icon: <Pill className="h-4 w-4" /> },
  { label: 'Culture & Sensitivity', path: `${labBase}/culture`, icon: <Microscope className="h-4 w-4" /> },
  { label: 'Seminal Fluid Analysis', path: `${labBase}/sfa`, icon: <Droplets className="h-4 w-4" /> },
  { label: 'Blood Bank & Crossmatch', path: `${labBase}/blood-bank`, icon: <TestTube2 className="h-4 w-4" /> },
  { label: 'Patient History Center', path: `${labBase}/history`, icon: <History className="h-4 w-4" /> },
  { label: 'All Results Dashboard', path: `${labBase}/all-results`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Print Center', path: `${labBase}/print`, icon: <Printer className="h-4 w-4" /> },
  { label: 'Communication Center', path: `${labBase}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Reporting Center', path: `${labBase}/reports`, icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Analytics Dashboard', path: `${labBase}/analytics`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Critical Alerts', path: `${labBase}/alerts`, icon: <ShieldAlert className="h-4 w-4" /> },
  { label: 'Specimen Tracking', path: `${labBase}/specimens`, icon: <Send className="h-4 w-4" /> },
  { label: 'Microbiology Workbench', path: `${labBase}/microbiology`, icon: <Microscope className="h-4 w-4" /> },
  { label: 'Histopathology', path: `${labBase}/histopathology`, icon: <Beaker className="h-4 w-4" /> },
  { label: 'Quality Control', path: `${labBase}/qc`, icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Mobile / Tablet Mode', path: `${labBase}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Lab Configuration', path: `${labBase}/config`, icon: <Settings2 className="h-4 w-4" /> },
  { label: 'My Profile', path: `${labBase}/profile`, icon: <UserCog className="h-4 w-4" /> },
];
