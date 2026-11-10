import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

/**
 * Pharmacy procurement + inventory APIs under /api/pharmacy.
 * Suppliers, drug catalog (batch-tracked stock), purchase requests,
 * purchase orders, goods received notes and inventory stats.
 */

// ---------- Types ----------

export type ApiSupplierDrug = {
  drugId: number;
  name: string;
};

export type ApiSupplier = {
  supplierId: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  /** IDs of catalog drugs this supplier supplies (source of truth). */
  drugIds: number[];
  /** Joined drug names for display. */
  drugs: ApiSupplierDrug[];
  performance: number;
  status: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string | null;
};

export type ApiDrugBatch = {
  batchId: number;
  batchNo: string;
  mfgDate: string | null;
  expiryDate: string | null;
  qtyReceived: number;
  qtyAvailable: number;
  unitCost: number | null;
  sellingPrice: number | null;
  location: string | null;
  status: string;
  receivedAt: string | null;
};

export type ApiDrug = {
  drugId: number;
  name: string;
  genericName: string | null;
  category: string | null;
  form: string | null;
  strength: string | null;
  unit: string | null;
  unitPrice: number;
  reorderLevel: number;
  shelf: string | null;
  controlled: boolean;
  status: string;
  supplierId: number | null;
  supplierName: string | null;
  stock: number;
  earliestExpiry: string | null;
  earliestBatchNo: string | null;
  stockStatus: 'Active' | 'Low' | 'Out of Stock' | 'Expired' | string;
  createdAt: string | null;
  batches?: ApiDrugBatch[];
};

export type ApiPurchaseRequest = {
  requestId: number;
  requestNo: string;
  drugId: number;
  drugName: string;
  category: string | null;
  currentStock: number;
  reorderLevel: number;
  qty: number;
  priority: string;
  status: string;
  reason: string | null;
  note: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  createdAt: string | null;
};

export type ApiPurchaseOrderItem = {
  poItemId: number;
  drugId: number;
  drugName: string;
  qty: number;
  unitCost: number;
  qtyReceived: number;
};

export type ApiPurchaseOrder = {
  poId: number;
  poNo: string;
  supplierId: number;
  supplierName: string;
  items: ApiPurchaseOrderItem[];
  total: number;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected' | string;
  deliveryStatus: 'Not Sent' | 'Sent' | 'Partial' | 'Delivered' | string;
  status: string;
  expectedDate: string | null;
  paymentTerms: string | null;
  notes: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  createdAt: string | null;
  updatedAt?: string | null;
};

export type ApiGrn = {
  grnId: number;
  grnNo: string;
  poId: number | null;
  poNo: string | null;
  supplierName: string | null;
  drugId: number;
  drugName: string;
  batchNo: string;
  mfgDate: string | null;
  expiryDate: string | null;
  qtyOrdered: number;
  qtyReceived: number;
  qtyDamaged: number;
  qtyAccepted: number;
  location: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
};

export type ProcurementStats = {
  asOf: string;
  pendingRequests: number;
  posAwaitingApproval: number;
  sentToSuppliers: number;
  partiallyDelivered: number;
  completed: number;
  totalProcurementValue: number;
};

export type ProcurementHistoryCards = {
  asOf: string;
  completedOrders: number;
  cancelledOrders: number;
  partiallyDelivered: number;
  grnCount: number;
  completedValue: number;
  receivedValue: number;
  totalDamagedQty: number;
  totalAcceptedQty: number;
};

export type ProcurementHistoryItem = {
  poId: number;
  poNo: string;
  supplierName: string;
  status: string;
  approvalStatus: string;
  deliveryStatus: string;
  total: number;
  itemCount: number;
  drugsSummary: string;
  qtyOrdered: number;
  qtyReceived: number;
  qtyAccepted: number;
  qtyDamaged: number;
  grnCount: number;
  createdBy: string | null;
  approvedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type InventoryStats = {
  asOf: string;
  totalDrugs: number;
  available: number;
  lowStock: number;
  outOfStock: number;
  expired: number;
  expiringSoon: number;
  recentlyReceived: number;
};

// ---------- Suppliers ----------

export async function createSupplier(payload: {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  /** DRUG_IDs from the drug catalog this supplier supplies. */
  drugIds?: number[];
  performance?: number;
  notes?: string;
}): Promise<ApiSupplier> {
  const body = await apiRequest<ApiEnvelope<ApiSupplier>>(
    '/api/pharmacy/suppliers',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listSuppliers(params?: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiSupplier>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 100));
  const body = await apiRequest<ApiEnvelope<Paged<ApiSupplier>>>(
    `/api/pharmacy/suppliers?${qs}`,
  );
  return body.data;
}

export async function updateSupplier(
  supplierId: number,
  payload: Partial<{
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    /** Replaces the supplier's full set of supplied drugs. */
    drugIds: number[];
    performance: number;
    notes: string;
    status: 'Active' | 'Inactive';
  }>,
): Promise<ApiSupplier> {
  const body = await apiRequest<ApiEnvelope<ApiSupplier>>(
    `/api/pharmacy/suppliers/${supplierId}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

// ---------- Drugs / Inventory ----------

export async function createDrug(payload: {
  name: string;
  genericName?: string;
  category?: string;
  form?: string;
  strength?: string;
  unit?: string;
  unitPrice?: number;
  reorderLevel?: number;
  shelf?: string;
  controlled?: boolean;
  supplierId?: number;
}): Promise<ApiDrug> {
  const body = await apiRequest<ApiEnvelope<ApiDrug>>('/api/pharmacy/drugs', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function listDrugs(params?: {
  q?: string;
  category?: string;
  stockStatus?: string;
  supplierId?: number;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiDrug>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.category && params.category !== 'all') qs.set('category', params.category);
  if (params?.stockStatus && params.stockStatus !== 'all')
    qs.set('stockStatus', params.stockStatus);
  if (params?.supplierId != null) qs.set('supplierId', String(params.supplierId));
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 100));
  const body = await apiRequest<ApiEnvelope<Paged<ApiDrug>>>(
    `/api/pharmacy/drugs?${qs}`,
  );
  return body.data;
}

export async function getDrug(drugId: number): Promise<ApiDrug> {
  const body = await apiRequest<ApiEnvelope<ApiDrug>>(
    `/api/pharmacy/drugs/${drugId}`,
  );
  return body.data;
}

export async function updateDrug(
  drugId: number,
  payload: Partial<{
    name: string;
    genericName: string;
    category: string;
    form: string;
    strength: string;
    unit: string;
    unitPrice: number;
    reorderLevel: number;
    shelf: string;
    controlled: boolean;
    supplierId: number;
    status: 'Active' | 'Discontinued';
  }>,
): Promise<ApiDrug> {
  const body = await apiRequest<ApiEnvelope<ApiDrug>>(
    `/api/pharmacy/drugs/${drugId}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const body = await apiRequest<ApiEnvelope<InventoryStats>>(
    '/api/pharmacy/inventory/stats',
  );
  return body.data;
}

export async function adjustStock(payload: {
  drugId: number;
  qty: number;
  reason: string;
}): Promise<ApiDrug> {
  const body = await apiRequest<ApiEnvelope<ApiDrug>>(
    '/api/pharmacy/inventory/adjustments',
    { method: 'POST', body: payload },
  );
  return body.data;
}

// ---------- Procurement ----------

export async function getProcurementStats(): Promise<ProcurementStats> {
  const body = await apiRequest<ApiEnvelope<ProcurementStats>>(
    '/api/pharmacy/procurement/stats',
  );
  return body.data;
}

export async function createPurchaseRequest(payload: {
  drugId: number;
  qty: number;
  priority?: string;
  reason?: string;
  note?: string;
  requestedBy?: string;
}): Promise<ApiPurchaseRequest> {
  const body = await apiRequest<ApiEnvelope<ApiPurchaseRequest>>(
    '/api/pharmacy/procurement/requests',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listPurchaseRequests(params?: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiPurchaseRequest>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiPurchaseRequest>>>(
    `/api/pharmacy/procurement/requests?${qs}`,
  );
  return body.data;
}

export async function approvePurchaseRequest(id: number): Promise<ApiPurchaseRequest> {
  const body = await apiRequest<ApiEnvelope<ApiPurchaseRequest>>(
    `/api/pharmacy/procurement/requests/${id}/approve`,
    { method: 'PATCH' },
  );
  return body.data;
}

export async function rejectPurchaseRequest(id: number): Promise<ApiPurchaseRequest> {
  const body = await apiRequest<ApiEnvelope<ApiPurchaseRequest>>(
    `/api/pharmacy/procurement/requests/${id}/reject`,
    { method: 'PATCH' },
  );
  return body.data;
}

export async function createPurchaseOrder(payload: {
  supplierId: number;
  items: { drugId: number; qty: number; unitCost: number }[];
  expectedDate?: string;
  paymentTerms?: string;
  notes?: string;
}): Promise<ApiPurchaseOrder> {
  const body = await apiRequest<ApiEnvelope<ApiPurchaseOrder>>(
    '/api/pharmacy/procurement/orders',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listPurchaseOrders(params?: {
  q?: string;
  status?: string;
  approvalStatus?: string;
  deliveryStatus?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiPurchaseOrder>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  if (params?.approvalStatus && params.approvalStatus !== 'all')
    qs.set('approvalStatus', params.approvalStatus);
  if (params?.deliveryStatus && params.deliveryStatus !== 'all')
    qs.set('deliveryStatus', params.deliveryStatus);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiPurchaseOrder>>>(
    `/api/pharmacy/procurement/orders?${qs}`,
  );
  return body.data;
}

/** Approved POs awaiting or mid-delivery — for Receive Stock dropdown. */
export async function listReceivableOrders(params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiPurchaseOrder>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 100));
  const body = await apiRequest<ApiEnvelope<Paged<ApiPurchaseOrder>>>(
    `/api/pharmacy/procurement/orders/receivable?${qs}`,
  );
  return body.data;
}

export async function getProcurementHistory(params?: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  cards: ProcurementHistoryCards;
  items: ProcurementHistoryItem[];
  meta: Meta;
}> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<{
      cards: ProcurementHistoryCards;
      items: ProcurementHistoryItem[];
      meta: Meta;
    }>
  >(`/api/pharmacy/procurement/history?${qs}`);
  return body.data;
}

export async function approvePurchaseOrder(id: number): Promise<ApiPurchaseOrder> {
  const body = await apiRequest<ApiEnvelope<ApiPurchaseOrder>>(
    `/api/pharmacy/procurement/orders/${id}/approve`,
    { method: 'PATCH' },
  );
  return body.data;
}

export async function rejectPurchaseOrder(id: number): Promise<ApiPurchaseOrder> {
  const body = await apiRequest<ApiEnvelope<ApiPurchaseOrder>>(
    `/api/pharmacy/procurement/orders/${id}/reject`,
    { method: 'PATCH' },
  );
  return body.data;
}

export async function sendPurchaseOrder(id: number): Promise<ApiPurchaseOrder> {
  const body = await apiRequest<ApiEnvelope<ApiPurchaseOrder>>(
    `/api/pharmacy/procurement/orders/${id}/send`,
    { method: 'PATCH' },
  );
  return body.data;
}

export async function receiveStock(payload: {
  poId?: number;
  drugId: number;
  batchNo: string;
  mfgDate?: string;
  expiryDate?: string;
  qtyOrdered?: number;
  qtyReceived: number;
  qtyDamaged?: number;
  unitCost?: number;
  sellingPrice?: number;
  location?: string;
  receivedBy?: string;
}): Promise<ApiGrn> {
  const body = await apiRequest<ApiEnvelope<ApiGrn>>(
    '/api/pharmacy/procurement/receive',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listGrns(params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiGrn>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiGrn>>>(
    `/api/pharmacy/procurement/grns?${qs}`,
  );
  return body.data;
}

export function isPharmacyApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}
