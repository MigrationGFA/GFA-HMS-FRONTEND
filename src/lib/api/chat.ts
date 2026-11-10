import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };

export type ChatModuleId =
  | 'doctor'
  | 'laboratory'
  | 'pharmacy'
  | 'cashier'
  | 'records';

export type ChatConversation = {
  id: string;
  type: string;
  moduleScope: string[];
  group: string;
  title: string;
  participantUserIds: number[];
  patientId: string | null;
  patientName: string | null;
  hospitalNo: string | null;
  urgent: boolean;
  archived: boolean;
  lastMessage: string;
  lastMessageAt: string | null;
  unread: number;
  createdById: number | null;
  createdBy: string | null;
  createdAt: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderUserId: number;
  senderName: string;
  text: string;
  urgent: boolean;
  mentions: string[];
  attachmentUrl: string | null;
  readBy: number[];
  edited: boolean;
  createdAt: string | null;
};

export type ChatBroadcast = {
  id: string;
  target: string;
  moduleScope: string[];
  priority: string;
  message: string;
  patientName: string | null;
  expiry: string | null;
  sentBy: string;
  sentByUserId: number;
  conversationId: string | null;
  sentAt: string | null;
};

export type ChatDirectoryUser = {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  modules: string[];
  displayName: string;
};

export const CHAT_GROUPS = [
  'Nurses',
  'Laboratory',
  'Radiology',
  'Pharmacy',
  'Accounts',
  'Medical Records',
  'Management',
  'Psychology',
  'Social Work',
  'Nutrition',
  'Ward Team',
  'Emergency Unit',
  'Consultants',
  'NHIA/NHIS',
  'ICT Support',
] as const;

/** Map UI group labels → chat module for directory filtering. */
export const GROUP_TO_CHAT_MODULE: Partial<
  Record<(typeof CHAT_GROUPS)[number], ChatModuleId>
> = {
  Nurses: 'doctor',
  Laboratory: 'laboratory',
  Pharmacy: 'pharmacy',
  Accounts: 'cashier',
  'Medical Records': 'records',
};

export function isChatApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function listChatConversations(params?: {
  module?: ChatModuleId;
  tab?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.module) qs.set('module', params.module);
  if (params?.tab) qs.set('tab', params.tab);
  if (params?.q) qs.set('q', params.q);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiRequest<
    ApiEnvelope<{ items: ChatConversation[]; meta: Meta }>
  >(`/api/chat/conversations${suffix}`);
  return res.data;
}

export async function createChatConversation(payload: {
  type: 'direct' | 'department' | 'patient';
  group: string;
  title: string;
  participantUserIds: number[];
  moduleScope?: string[];
  patientId?: string;
  patientName?: string;
  hospitalNo?: string;
  urgent?: boolean;
  initialMessage?: string;
}) {
  const res = await apiRequest<
    ApiEnvelope<{ conversation: ChatConversation; message: ChatMessage | null }>
  >('/api/chat/conversations', { method: 'POST', body: payload });
  return res.data;
}

export async function listChatMessages(
  conversationId: string,
  params?: { page?: number; limit?: number },
) {
  const qs = new URLSearchParams();
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiRequest<
    ApiEnvelope<{
      items: ChatMessage[];
      meta: Meta;
      conversation: ChatConversation;
    }>
  >(`/api/chat/conversations/${conversationId}/messages${suffix}`);
  return res.data;
}

export async function sendChatMessage(
  conversationId: string,
  payload: {
    text: string;
    urgent?: boolean;
    mentions?: string[];
    attachmentUrl?: string;
  },
) {
  const res = await apiRequest<
    ApiEnvelope<{ conversation: ChatConversation; message: ChatMessage }>
  >(`/api/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: payload,
  });
  return res.data;
}

export async function markChatRead(conversationId: string) {
  const res = await apiRequest<ApiEnvelope<{ conversation: ChatConversation }>>(
    `/api/chat/conversations/${conversationId}/read`,
    { method: 'PATCH' },
  );
  return res.data;
}

export async function archiveChatConversation(conversationId: string) {
  const res = await apiRequest<ApiEnvelope<{ conversation: ChatConversation }>>(
    `/api/chat/conversations/${conversationId}/archive`,
    { method: 'PATCH' },
  );
  return res.data;
}

export async function listChatBroadcasts(params?: { page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiRequest<
    ApiEnvelope<{ items: ChatBroadcast[]; meta: Meta }>
  >(`/api/chat/broadcasts${suffix}`);
  return res.data;
}

export async function createChatBroadcast(payload: {
  target: string;
  priority: 'Normal' | 'Urgent' | 'Emergency';
  message: string;
  moduleScope?: string[];
  patientName?: string;
  expiry?: string;
}) {
  const res = await apiRequest<ApiEnvelope<{ broadcast: ChatBroadcast }>>(
    '/api/chat/broadcasts',
    { method: 'POST', body: payload },
  );
  return res.data;
}

export async function listChatDirectory(params?: {
  q?: string;
  module?: ChatModuleId;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.module) qs.set('module', params.module);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const res = await apiRequest<
    ApiEnvelope<{ items: ChatDirectoryUser[]; meta: Meta }>
  >(`/api/chat/directory${suffix}`);
  return res.data;
}
