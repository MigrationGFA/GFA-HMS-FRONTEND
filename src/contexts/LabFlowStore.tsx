// LabFlowStore — single source of truth for doctor-originated lab requests.
// Lifecycle: PENDING_DOCTOR → SENT_TO_BILLING → AWAITING_PAYMENT
//           → PAID | NHIA_APPROVED | HMO_APPROVED | WAIVED (= Sample Collection Ready)
//           → SAMPLE_COLLECTED → RESULT_ENTERED → AWAITING_VALIDATION → COMPLETED
//           or REJECTED / CANCELLED at any step.
// Backed by db.orders (kind:'lab') — sendToBilling/generateInvoice create real hospital invoices.

import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { db } from '@/db/database';
import { useDbTick } from '@/contexts/DatabaseProvider';
import {
  addLabOrder,
  generateLabInvoice,
  listLabFlowRequests,
  markLabOrderPaid,
  newLabSampleId,
  onInvoicePaidForLab,
  patchLabOrderStatus,
  sendLabOrderToBilling,
} from '@/lib/lab-actions';

export type LabFlowStatus =
  | 'PENDING_DOCTOR'
  | 'SENT_TO_BILLING'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'NHIA_PENDING'
  | 'NHIA_APPROVED'
  | 'HMO_PENDING'
  | 'HMO_APPROVED'
  | 'WAIVED'
  | 'SAMPLE_COLLECTED'
  | 'IN_PROCESSING'
  | 'DRAFT'
  | 'AWAITING_VALIDATION'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface LabFlowTest {
  code: string;
  name: string;
  price: number;
  covered?: boolean;
}

export interface LabFlowRequest {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female';
  hospitalNo: string;
  doctor: string;
  department: string;
  ward?: string;
  source: 'Doctor' | 'Walk-In';
  tests: LabFlowTest[];
  priority: 'Routine' | 'Urgent' | 'Stat';
  status: LabFlowStatus;
  paymentType?: 'Cash' | 'POS' | 'Transfer' | 'Wallet' | 'NHIA' | 'HMO';
  paymentRef?: string;
  cashier?: string;
  invoiceNo?: string;
  nhia?: { number?: string; authCode?: string; copay?: number; approvedBy?: string };
  hmo?: { name?: string; authCode?: string; approvedBy?: string };
  sampleId?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
  clinicalNote?: string;
  audit: { action: string; by: string; at: string; note?: string }[];
}

interface Ctx {
  requests: LabFlowRequest[];
  addRequest: (r: Omit<LabFlowRequest, 'audit' | 'createdAt' | 'updatedAt' | 'status'> & { status?: LabFlowStatus }) => LabFlowRequest;
  sendToBilling: (id: string, by?: string) => void;
  generateInvoice: (id: string, by?: string) => string;
  markPaid: (id: string, p: { amount: number; method: 'Cash' | 'POS' | 'Transfer' | 'Wallet'; ref: string; cashier: string }) => void;
  submitNhia: (id: string, n: { number: string; authCode?: string }) => void;
  approveNhia: (id: string, n: { number: string; authCode: string; copay: number; approvedBy: string }) => void;
  submitHmo: (id: string, h: { name: string }) => void;
  approveHmo: (id: string, h: { name: string; authCode: string; approvedBy: string }) => void;
  waive: (id: string, reason: string, by: string) => void;
  cancel: (id: string, reason: string, by: string) => void;
  reject: (id: string, reason: string, by: string) => void;
  collectSample: (id: string, sampleId: string, by: string) => void;
  saveDraftResult: (id: string, by: string) => void;
  submitForValidation: (id: string, by: string) => void;
  validate: (id: string, by: string) => void;
}

const C = createContext<Ctx | undefined>(undefined);

export const LabFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const _tick = useDbTick();

  useEffect(() => db.on('INVOICE_PAID', (payload) => {
    const { invoiceId } = (payload ?? {}) as { invoiceId?: string };
    if (invoiceId) onInvoicePaidForLab(invoiceId);
  }), []);

  const requests = listLabFlowRequests();

  const addRequest: Ctx['addRequest'] = useCallback((r) => addLabOrder(r), []);

  const sendToBilling: Ctx['sendToBilling'] = useCallback((id, by = 'Lab User') => {
    sendLabOrderToBilling(id, by);
    toast.success('Laboratory request sent to billing successfully.');
  }, []);

  const generateInvoice: Ctx['generateInvoice'] = useCallback((id, by = 'Cashier') => {
    const inv = generateLabInvoice(id, by);
    return inv;
  }, []);

  const markPaid: Ctx['markPaid'] = useCallback((id, p) => {
    markLabOrderPaid(id, p);
    toast.success('Payment recorded. Request now in Sample Collection Ready.');
  }, []);

  const submitNhia: Ctx['submitNhia'] = useCallback((id, n) => {
    patchLabOrderStatus(id, 'NHIA_PENDING', { paymentType: 'NHIA', nhia: { number: n.number, authCode: n.authCode } },
      `Submitted for NHIA approval (${n.number})`, 'Cashier');
    toast.success('Submitted for NHIA approval.');
  }, []);

  const approveNhia: Ctx['approveNhia'] = useCallback((id, n) => {
    patchLabOrderStatus(id, 'NHIA_APPROVED', { nhia: n },
      `NHIA approved — auth ${n.authCode}, copay ₦${n.copay.toLocaleString()}`, n.approvedBy);
    toast.success('NHIA approved — request ready for sample collection.');
  }, []);

  const submitHmo: Ctx['submitHmo'] = useCallback((id, h) => {
    patchLabOrderStatus(id, 'HMO_PENDING', { paymentType: 'HMO', hmo: { name: h.name } },
      `Submitted to HMO ${h.name}`, 'Cashier');
    toast.success('Submitted for HMO approval.');
  }, []);

  const approveHmo: Ctx['approveHmo'] = useCallback((id, h) => {
    patchLabOrderStatus(id, 'HMO_APPROVED', { hmo: h },
      `HMO ${h.name} approved — auth ${h.authCode}`, h.approvedBy);
    toast.success('HMO approved — request ready for sample collection.');
  }, []);

  const waive: Ctx['waive'] = useCallback((id, reason, by) => {
    patchLabOrderStatus(id, 'WAIVED', {}, `Payment waived — ${reason}`, by);
    toast.success('Payment waived.');
  }, []);

  const cancel: Ctx['cancel'] = useCallback((id, reason, by) => {
    patchLabOrderStatus(id, 'CANCELLED', { rejectReason: reason }, `Cancelled — ${reason}`, by);
    toast.success('Request cancelled.');
  }, []);

  const reject: Ctx['reject'] = useCallback((id, reason, by) => {
    patchLabOrderStatus(id, 'REJECTED', { rejectReason: reason }, `Rejected — ${reason}`, by);
    toast.error('Request rejected.');
  }, []);

  const collectSample: Ctx['collectSample'] = useCallback((id, sampleId, by) => {
    patchLabOrderStatus(id, 'SAMPLE_COLLECTED', { sampleId }, `Sample ${sampleId} collected`, by);
    toast.success(`Sample ${sampleId} collected.`);
  }, []);

  const saveDraftResult: Ctx['saveDraftResult'] = useCallback((id, by) => {
    patchLabOrderStatus(id, 'DRAFT', {}, 'Result draft saved', by);
    toast.success('Draft result saved.');
  }, []);

  const submitForValidation: Ctx['submitForValidation'] = useCallback((id, by) => {
    patchLabOrderStatus(id, 'AWAITING_VALIDATION', {}, 'Sent for validation', by);
    toast.success('Result sent for validation.');
  }, []);

  const validate: Ctx['validate'] = useCallback((id, by) => {
    patchLabOrderStatus(id, 'COMPLETED', {}, 'Result validated and released', by);
    toast.success('Result validated and released.');
  }, []);

  const value = useMemo<Ctx>(() => ({
    requests,
    addRequest,
    sendToBilling,
    generateInvoice,
    markPaid,
    submitNhia,
    approveNhia,
    submitHmo,
    approveHmo,
    waive,
    cancel,
    reject,
    collectSample,
    saveDraftResult,
    submitForValidation,
    validate,
  }), [
    _tick,
    requests,
    addRequest,
    sendToBilling,
    generateInvoice,
    markPaid,
    submitNhia,
    approveNhia,
    submitHmo,
    approveHmo,
    waive,
    cancel,
    reject,
    collectSample,
    saveDraftResult,
    submitForValidation,
    validate,
  ]);

  return <C.Provider value={value}>{children}</C.Provider>;
};

export const useLabFlow = () => {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useLabFlow must be used inside LabFlowProvider');
  return ctx;
};

export const newSampleId = () => newLabSampleId();

export const statusTone = (s: LabFlowStatus): string => {
  switch (s) {
    case 'PAID': case 'NHIA_APPROVED': case 'HMO_APPROVED': case 'WAIVED':
    case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'PENDING_DOCTOR': case 'SENT_TO_BILLING': case 'AWAITING_PAYMENT':
    case 'NHIA_PENDING': case 'HMO_PENDING': case 'AWAITING_VALIDATION':
    case 'DRAFT': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'SAMPLE_COLLECTED': case 'IN_PROCESSING': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'REJECTED': case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

export const isCollectionReady = (s: LabFlowStatus) =>
  s === 'PAID' || s === 'NHIA_APPROVED' || s === 'HMO_APPROVED' || s === 'WAIVED';

export const STATUS_LABEL: Record<LabFlowStatus, string> = {
  PENDING_DOCTOR: 'Pending Doctor Request',
  SENT_TO_BILLING: 'Sent to Billing',
  AWAITING_PAYMENT: 'Awaiting Payment',
  PAID: 'Paid',
  NHIA_PENDING: 'NHIA Pending',
  NHIA_APPROVED: 'NHIA Approved',
  HMO_PENDING: 'HMO Pending',
  HMO_APPROVED: 'HMO Approved',
  WAIVED: 'Waived',
  SAMPLE_COLLECTED: 'Sample Collected',
  IN_PROCESSING: 'In Processing',
  DRAFT: 'Draft Result',
  AWAITING_VALIDATION: 'Awaiting Validation',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};
