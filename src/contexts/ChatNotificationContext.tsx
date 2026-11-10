import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  isChatApiEnabled,
  listChatConversations,
  type ChatConversation,
  type ChatMessage,
} from '@/lib/api/chat';
import {
  commsPathForRole,
  commsPathWithThread,
  isCommsRoute,
} from '@/lib/comms/commsRoutes';
import {
  disconnectChatSocket,
  subscribeChatSocket,
} from '@/lib/realtime/chatSocket';

type ChatNotificationContextValue = {
  totalUnread: number;
  refreshUnread: () => Promise<void>;
  commsPath: string;
};

const ChatNotificationContext = createContext<ChatNotificationContextValue | null>(
  null,
);

function sumUnread(items: ChatConversation[]): number {
  return items.reduce((s, c) => s + (c.unread || 0), 0);
}

export function ChatNotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [totalUnread, setTotalUnread] = useState(0);
  const activeThreadRef = useRef<string | null>(null);
  const apiOn = isChatApiEnabled();

  const commsPath = useMemo(
    () => commsPathForRole(user?.role),
    [user?.role],
  );

  const refreshUnread = useCallback(async () => {
    if (!apiOn || !isAuthenticated) {
      setTotalUnread(0);
      return;
    }
    try {
      const res = await listChatConversations({ limit: 80 });
      setTotalUnread(sumUnread(res.items));
    } catch {
      // keep last known count
    }
  }, [apiOn, isAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    activeThreadRef.current = params.get('thread');
  }, [location.search]);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread, isAuthenticated]);

  useEffect(() => {
    if (!apiOn || !isAuthenticated) {
      disconnectChatSocket();
      return;
    }

    const unsub = subscribeChatSocket({
      onMessage: ({ conversation, message }) => {
        void refreshUnread();
        notifyIfNeeded(conversation, message);
      },
      onConversationUpdated: () => {
        void refreshUnread();
      },
      onBroadcast: (b) => {
        if (!isCommsRoute(location.pathname)) {
          toast.message(`Broadcast: ${b.target}`, {
            description: b.message.slice(0, 120),
          });
        }
      },
    });

    return unsub;
  }, [apiOn, isAuthenticated, location.pathname, refreshUnread, user?.id]);

  function notifyIfNeeded(conversation: ChatConversation, message: ChatMessage) {
    if (!user?.id) return;
    if (String(message.senderUserId) === String(user.id)) return;

    const onComms = isCommsRoute(location.pathname);
    const viewingThread =
      onComms && activeThreadRef.current === conversation.id;

    if (onComms && viewingThread) return;

    const openPath = commsPathWithThread(commsPath, conversation.id);
    const description = message.text.slice(0, 120);

    if (message.urgent || conversation.urgent) {
      toast.error(`Urgent message from ${message.senderName}`, {
        description,
        action: {
          label: 'Open',
          onClick: () => navigate(openPath),
        },
        duration: 10000,
      });
    } else {
      toast.message(`New message from ${message.senderName}`, {
        description,
        action: {
          label: 'Open',
          onClick: () => navigate(openPath),
        },
      });
    }
  }

  const value = useMemo(
    () => ({ totalUnread, refreshUnread, commsPath }),
    [totalUnread, refreshUnread, commsPath],
  );

  return (
    <ChatNotificationContext.Provider value={value}>
      {children}
    </ChatNotificationContext.Provider>
  );
}

export function useChatNotifications(): ChatNotificationContextValue {
  const ctx = useContext(ChatNotificationContext);
  if (!ctx) {
    return {
      totalUnread: 0,
      refreshUnread: async () => {},
      commsPath: '/dashboard/doctor/clinical/comms',
    };
  }
  return ctx;
}
