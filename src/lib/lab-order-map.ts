import type { Order, LabOrderMeta } from '@/data-access/types';
import type { LabFlowRequest, LabFlowStatus } from '@/contexts/LabFlowStore';

export function orderToLabFlowRequest(order: Order): LabFlowRequest {
  const m = order.labMeta!;
  return {
    id: order.id,
    patientId: order.patientId,
    patientName: m.patientName,
    age: m.age,
    gender: m.gender,
    hospitalNo: m.hospitalNo,
    doctor: order.orderedBy,
    department: m.department,
    ward: m.ward,
    source: m.source,
    tests: order.items.map(i => ({
      code: i.code,
      name: i.name,
      price: i.price,
      covered: i.covered,
    })),
    priority: m.priority,
    status: order.status as LabFlowStatus,
    paymentType: m.paymentType,
    paymentRef: m.paymentRef,
    cashier: m.cashier,
    invoiceNo: order.invoiceId,
    nhia: m.nhia,
    hmo: m.hmo,
    sampleId: m.sampleId,
    rejectReason: m.rejectReason,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    clinicalNote: m.clinicalNote,
    audit: m.audit,
  };
}

export function labFlowInputToOrder(
  input: Omit<LabFlowRequest, 'audit' | 'createdAt' | 'updatedAt' | 'status'> & { status?: LabFlowStatus },
  id: string,
  timestamps: { createdAt: string; updatedAt: string },
): Order {
  const labMeta: LabOrderMeta = {
    patientName: input.patientName,
    age: input.age,
    gender: input.gender,
    hospitalNo: input.hospitalNo,
    department: input.department,
    ward: input.ward,
    source: input.source,
    priority: input.priority,
    paymentType: input.paymentType,
    paymentRef: input.paymentRef,
    cashier: input.cashier,
    nhia: input.nhia,
    hmo: input.hmo,
    sampleId: input.sampleId,
    rejectReason: input.rejectReason,
    clinicalNote: input.clinicalNote,
    audit: [{ action: 'Request created', by: input.doctor || 'Lab User', at: timestamps.createdAt }],
  };

  return {
    id,
    patientId: input.patientId,
    kind: 'lab',
    items: input.tests.map(t => ({ code: t.code, name: t.name, price: t.price, covered: t.covered })),
    status: input.status ?? 'PENDING_DOCTOR',
    invoiceId: input.invoiceNo,
    orderedBy: input.doctor,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
    labMeta,
  };
}

export const listLabOrders = (orders: Order[]) =>
  orders.filter(o => o.kind === 'lab' && o.labMeta).map(orderToLabFlowRequest);
