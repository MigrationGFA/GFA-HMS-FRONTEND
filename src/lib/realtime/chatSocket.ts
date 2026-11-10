import { io, type Socket } from 'socket.io-client';
import { env } from '../env';
import { getAccessToken } from '../api/client';
import type { ChatConversation, ChatMessage, ChatBroadcast } from '../api/chat';

export type ChatSocketHandlers = {
  onMessage?: (payload: {
    conversation: ChatConversation;
    message: ChatMessage;
  }) => void;
  onConversationUpdated?: (payload: { conversation: ChatConversation }) => void;
  onBroadcast?: (payload: ChatBroadcast) => void;
  onRead?: (payload: { conversationId: string; userId: number }) => void;
  onPresence?: (payload: {
    userId: number;
    status: string;
    lastSeenAt: string | null;
  }) => void;
  onTyping?: (payload: { conversationId: string; userId: number }) => void;
};

type Subscriber = { id: string; handlers: ChatSocketHandlers };

let socket: Socket | null = null;
let connectedToken: string | null = null;
const subscribers = new Map<string, Subscriber>();
let subscriberSeq = 0;

function chatWsUrl(): string {
  return env.apiBaseUrl.replace(/\/$/, '');
}

function dispatch(event: keyof ChatSocketHandlers, payload: unknown) {
  for (const sub of subscribers.values()) {
    const handler = sub.handlers[event];
    if (handler) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handler as (p: unknown) => void)(payload);
    }
  }
}

function attachSocketListeners(s: Socket) {
  s.off('chat:message');
  s.off('chat:conversation-updated');
  s.off('chat:broadcast');
  s.off('chat:read');
  s.off('chat:presence');
  s.off('chat:typing');

  s.on('chat:message', (payload) => dispatch('onMessage', payload));
  s.on('chat:conversation-updated', (payload) =>
    dispatch('onConversationUpdated', payload),
  );
  s.on('chat:broadcast', (payload) => dispatch('onBroadcast', payload));
  s.on('chat:read', (payload) => dispatch('onRead', payload));
  s.on('chat:presence', (payload) => dispatch('onPresence', payload));
  s.on('chat:typing', (payload) => dispatch('onTyping', payload));
}

function ensureChatSocket(): Socket | null {
  if (!env.useApi || !env.apiBaseUrl) return null;
  const token = getAccessToken();
  if (!token) return null;

  if (socket?.connected && connectedToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
    connectedToken = null;
  }

  socket = io(`${chatWsUrl()}/chat`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
  });
  connectedToken = token;
  attachSocketListeners(socket);
  return socket;
}

/** Subscribe to chat socket events. Returns unsubscribe function. */
export function subscribeChatSocket(handlers: ChatSocketHandlers = {}): () => void {
  const id = `sub-${++subscriberSeq}`;
  subscribers.set(id, { id, handlers });
  ensureChatSocket();
  return () => {
    subscribers.delete(id);
  };
}

/** @deprecated Use subscribeChatSocket — kept for compatibility */
export function connectChatSocket(handlers: ChatSocketHandlers = {}): Socket | null {
  subscribeChatSocket(handlers);
  return ensureChatSocket();
}

export function joinChatConversation(conversationId: string) {
  ensureChatSocket();
  socket?.emit('chat:join', { conversationId });
}

export function emitChatTyping(conversationId: string) {
  ensureChatSocket();
  socket?.emit('chat:typing', { conversationId });
}

export function disconnectChatSocket() {
  socket?.disconnect();
  socket = null;
  connectedToken = null;
  subscribers.clear();
}

export function isChatSocketConnected(): boolean {
  return Boolean(socket?.connected);
}
