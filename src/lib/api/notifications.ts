import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type ApiNotification = {
  notificationId: number;
  userId: number;
  roleHint: string | null;
  type: string;
  title: string;
  body: string | null;
  linkPath: string | null;
  entity: string | null;
  entityId: number | null;
  personId: number | null;
  isRead: boolean;
  acknowledgedAt: string | null;
  createdAt: string;
};

export function isNotificationsApiEnabled(): boolean {
  return true; // offline demo fixtures via apiRequest stub
}

/** Clear legacy doctor mock notification/transfer keys when live API is on. */
export function clearDoctorTransferMockStorage(): void {
  if (typeof localStorage === 'undefined') return;
  const keys = [
    'gfa_doc_notifications_v1',
    'gfa_doc_transfer_audit_v1',
    'gfa_doc_transfer_timeline_v1',
    'gfa_doc_transfer_requests_v1',
    'gfa_unit_transfer_inbound_v1',
  ];
  for (const k of keys) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export async function listNotifications(params?: {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiNotification>> {
  const qs = new URLSearchParams();
  if (params?.unreadOnly) qs.set('unreadOnly', 'true');
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  const res = await apiRequest<ApiEnvelope<Paged<ApiNotification>>>(
    `/api/notifications${q ? `?${q}` : ''}`,
  );
  return res.data;
}

export async function notificationStats(): Promise<{ unread: number }> {
  const res = await apiRequest<ApiEnvelope<{ unread: number }>>('/api/notifications/stats');
  return res.data;
}

export async function markNotificationRead(id: number): Promise<ApiNotification> {
  const res = await apiRequest<ApiEnvelope<ApiNotification>>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
  return res.data;
}

export async function acknowledgeNotification(id: number): Promise<ApiNotification> {
  const res = await apiRequest<ApiEnvelope<ApiNotification>>(`/api/notifications/${id}/ack`, {
    method: 'POST',
  });
  return res.data;
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const res = await apiRequest<ApiEnvelope<{ updated: number }>>('/api/notifications/read-all', {
    method: 'POST',
  });
  return res.data;
}
