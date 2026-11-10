import { env } from '../env';
import { ApiError } from './client';
import {
  admissionBillPatientName,
  listCashierAdmissionBills,
} from './admission-bills';
import { dischargePatientName, listDischargeDrafts } from './discharge';
import { imagingPatientName, listCashierImagingRequests } from './imaging';
import { labPatientName, listCashierLabRequests } from './laboratory';
import { listCardPayments } from './patients';
import { listCashierPrescriptions } from './prescriptions';
import { listCashierPharmacySales, walkInCustomerName } from './walk-in-sales';

export type CashierBillKind = 'card' | 'pharmacy' | 'prescription' | 'lab' | 'admission' | 'imaging' | 'discharge';

export type CashierBillRow = {
  id: string;
  refNo: string;
  kind: CashierBillKind;
  patientName: string;
  hospitalNo?: string;
  department: string;
  amount: number;
  paymentStatus: string;
  createdAt?: string | null;
};

export type CashierBillsMode = 'pending' | 'paid';

export type CashierBillsResult = {
  items: CashierBillRow[];
  errors: string[];
};

function personLabel(person?: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
} | null): string {
  if (!person) return 'Unknown';
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ') || 'Unknown';
}

export function isCashierBillsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

const QUEUE_LABELS: Record<string, string> = {
  cards: 'Registration cards',
  sales: 'Pharmacy walk-in',
  rx: 'Prescriptions',
  lab: 'Laboratory',
  adm: 'Admission bills',
  img: 'Imaging',
  dis: 'Discharge',
};

function queueErrorMessage(
  key: keyof typeof QUEUE_LABELS,
  reason: unknown,
): string {
  const label = QUEUE_LABELS[key];
  if (reason instanceof ApiError && reason.status === 500) {
    return `${label} queue unavailable — contact admin if this persists`;
  }
  const msg = reason instanceof Error ? reason.message : String(reason);
  if (msg.toLowerCase() === 'internal server error') {
    return `${label} queue unavailable — contact admin if this persists`;
  }
  return `Could not load ${label.toLowerCase()} bills`;
}

export function collectPathForBill(kind: CashierBillKind): string {
  if (kind === 'card') return '/dashboard/cashier/cards';
  if (kind === 'pharmacy') return '/dashboard/cashier/pharmacy?tab=walkin';
  if (kind === 'prescription') return '/dashboard/cashier/pharmacy?tab=rx';
  if (kind === 'admission') return '/dashboard/cashier/pharmacy?tab=admission';
  if (kind === 'imaging') return '/dashboard/cashier/pharmacy?tab=imaging';
  if (kind === 'discharge') return '/dashboard/cashier/pharmacy?tab=discharge';
  return '/dashboard/cashier/pharmacy?tab=lab';
}

export function collectPathForSourceType(sourceType: string): string {
  const map: Record<string, CashierBillKind> = {
    card: 'card',
    pharmacy: 'pharmacy',
    prescription: 'prescription',
    lab: 'lab',
    admission: 'admission',
    imaging: 'imaging',
    discharge: 'discharge',
  };
  const kind = map[sourceType.toLowerCase()];
  return kind ? collectPathForBill(kind) : '/dashboard/cashier/pharmacy';
}

/** Aggregate live cashier queues into one bill list (no IndexedDB seed). */
export async function listCashierBills(mode: CashierBillsMode): Promise<CashierBillsResult> {
  const limit = 100;
  const errors: string[] = [];
  const items: CashierBillRow[] = [];

  const cardStatus = mode === 'pending' ? 'Pending' : 'Paid';
  const unpaidLike = mode === 'pending' ? 'Unpaid' : 'Paid';
  const rxStatus = mode === 'pending' ? 'Unpaid,Emergency' : 'Paid';
  const labStatus = mode === 'pending' ? 'Unpaid' : 'Paid,Waived';
  const admStatus = mode === 'pending' ? 'Unpaid' : 'Paid,Waived';
  const imgStatus = mode === 'pending' ? 'Unpaid' : 'Paid,Waived';
  const disStatus = mode === 'pending' ? 'AwaitingPayment,Submitted' : 'PaymentCleared,Discharged';

  const [cards, sales, rx, lab, adm, img, dis] = await Promise.allSettled([
    listCardPayments({ paymentStatus: cardStatus }),
    listCashierPharmacySales({ paymentStatus: unpaidLike, limit }),
    listCashierPrescriptions({ paymentStatus: rxStatus, limit }),
    listCashierLabRequests({ paymentStatus: labStatus, limit }),
    listCashierAdmissionBills({ paymentStatus: admStatus, limit }),
    listCashierImagingRequests({ paymentStatus: imgStatus, limit }),
    listDischargeDrafts({ status: disStatus, limit }),
  ]);

  if (cards.status === 'fulfilled') {
    for (const c of cards.value) {
      items.push({
        id: `card:${c.cardId}`,
        refNo: c.cardNo,
        kind: 'card',
        patientName: personLabel(c.person),
        hospitalNo: c.person?.hospitalNo ?? undefined,
        department: 'Registration',
        amount: c.totalAmount,
        paymentStatus: c.paymentStatus,
        createdAt: c.createdAt,
      });
    }
  } else {
    errors.push(queueErrorMessage('cards', cards.reason));
  }

  if (sales.status === 'fulfilled') {
    for (const s of sales.value.items) {
      items.push({
        id: `sale:${s.saleId}`,
        refNo: s.saleNo,
        kind: 'pharmacy',
        patientName: walkInCustomerName(s.person),
        hospitalNo: s.person?.hospitalNo ?? undefined,
        department: 'Pharmacy',
        amount: s.total,
        paymentStatus: s.paymentStatus,
        createdAt: s.createdAt,
      });
    }
  } else {
    errors.push(queueErrorMessage('sales', sales.reason));
  }

  if (rx.status === 'fulfilled') {
    for (const r of rx.value.items) {
      items.push({
        id: `rx:${r.prescriptionId}`,
        refNo: r.rxNo,
        kind: 'prescription',
        patientName: personLabel(r.person),
        hospitalNo: r.person?.hospitalNo ?? undefined,
        department: 'Prescription',
        amount: r.total,
        paymentStatus: r.paymentStatus,
        createdAt: r.createdAt,
      });
    }
  } else {
    errors.push(queueErrorMessage('rx', rx.reason));
  }

  if (lab.status === 'fulfilled') {
    for (const l of lab.value.items) {
      items.push({
        id: `lab:${l.labRequestId}`,
        refNo: l.requestNo,
        kind: 'lab',
        patientName: labPatientName(l.person),
        hospitalNo: l.person?.hospitalNo ?? undefined,
        department: 'Laboratory',
        amount: l.totalAmount,
        paymentStatus: l.paymentStatus,
        createdAt: l.createdAt,
      });
    }
  } else {
    errors.push(queueErrorMessage('lab', lab.reason));
  }

  if (adm.status === 'fulfilled') {
    for (const a of adm.value.items) {
      items.push({
        id: `adm:${a.admissionBillId}`,
        refNo: a.billNo,
        kind: 'admission',
        patientName: admissionBillPatientName(a.person),
        hospitalNo: a.person?.hospitalNo ?? undefined,
        department: 'Admission',
        amount: a.totalAmount,
        paymentStatus: a.paymentStatus,
        createdAt: a.createdAt,
      });
    }
  } else {
    errors.push(queueErrorMessage('adm', adm.reason));
  }

  if (img.status === 'fulfilled') {
    for (const r of img.value.items) {
      items.push({
        id: `img:${r.imagingRequestId}`,
        refNo: r.requestNo,
        kind: 'imaging',
        patientName: imagingPatientName(r.person),
        hospitalNo: r.person?.hospitalNo ?? undefined,
        department: 'Imaging',
        amount: r.totalAmount,
        paymentStatus: r.paymentStatus,
        createdAt: r.createdAt,
      });
    }
  } else {
    errors.push(queueErrorMessage('img', img.reason));
  }

  if (dis.status === 'fulfilled') {
    for (const d of dis.value.items) {
      items.push({
        id: `dis:${d.draftId}`,
        refNo: d.draftNo,
        kind: 'discharge',
        patientName: dischargePatientName(d),
        hospitalNo: d.person?.hospitalNo ?? undefined,
        department: 'Discharge',
        amount: d.payment?.items.reduce((sum, i) => sum + (i.amount ?? 0), 0) ?? 0,
        paymentStatus: d.status,
        createdAt: d.createdAt,
      });
    }
  } else {
    errors.push(queueErrorMessage('dis', dis.reason));
  }

  items.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  return { items, errors };
}
