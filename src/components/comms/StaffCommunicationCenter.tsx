import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useChatNotifications } from '@/contexts/ChatNotificationContext';
import { ApiError } from '@/lib/api/client';
import {
  archiveChatConversation,
  CHAT_GROUPS,
  GROUP_TO_CHAT_MODULE,
  createChatBroadcast,
  createChatConversation,
  isChatApiEnabled,
  listChatBroadcasts,
  listChatConversations,
  listChatDirectory,
  listChatMessages,
  markChatRead,
  sendChatMessage,
  type ChatBroadcast,
  type ChatConversation,
  type ChatDirectoryUser,
  type ChatMessage,
  type ChatModuleId,
} from '@/lib/api/chat';
import {
  emitChatTyping,
  joinChatConversation,
  subscribeChatSocket,
} from '@/lib/realtime/chatSocket';
import {
  MessageSquare,
  AlertTriangle,
  Send,
  Search,
  Archive,
  Plus,
  Bell,
  Users,
  Radio,
  Loader2,
  Megaphone,
  Circle,
  RefreshCw,
} from 'lucide-react';

type TabId = 'inbox' | 'department' | 'patient' | 'urgent' | 'broadcasts' | 'archived';

const Card = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={`bg-card rounded-xl border shadow-sm ${className}`}>{children}</div>
);

function timeLabel(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString();
}

function appendMessage(prev: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return prev.some((m) => m.id === message.id) ? prev : [...prev, message];
}

export type StaffCommunicationCenterProps = {
  module: ChatModuleId;
  navItems: { label: string; path: string; icon?: ReactNode }[];
  shellTitle: string;
  onOpenPatient?: (ctx: {
    patientId?: string | null;
    patientName?: string | null;
    hospitalNo?: string | null;
  }) => void;
};

export function StaffCommunicationCenter({
  module,
  navItems,
  shellTitle,
  onOpenPatient,
}: StaffCommunicationCenterProps) {
  const { user } = useAuth();
  const { refreshUnread } = useChatNotifications();
  const [searchParams] = useSearchParams();
  const threadParam = searchParams.get('thread');
  const openedThreadRef = useRef<string | null>(null);
  const apiOn = isChatApiEnabled();

  const [tab, setTab] = useState<TabId>('inbox');
  const [q, setQ] = useState('');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [broadcasts, setBroadcasts] = useState<ChatBroadcast[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [urgentSend, setUrgentSend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [directory, setDirectory] = useState<ChatDirectoryUser[]>([]);
  const [dirQ, setDirQ] = useState('');
  const [newGroup, setNewGroup] = useState<string>(CHAT_GROUPS[0]);
  const [newTitle, setNewTitle] = useState('');
  const [newPeerId, setNewPeerId] = useState<string>('');
  const [newInitial, setNewInitial] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [newHospitalNo, setNewHospitalNo] = useState('');
  const [newType, setNewType] = useState<'direct' | 'department' | 'patient'>('direct');
  const [bcTarget, setBcTarget] = useState('All Departments');
  const [bcPriority, setBcPriority] = useState<'Normal' | 'Urgent' | 'Emergency'>('Urgent');
  const [bcMessage, setBcMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const upsertConversation = useCallback((conv: ChatConversation) => {
    setConversations((prev) => {
      const rest = prev.filter((c) => c.id !== conv.id);
      return [conv, ...rest];
    });
  }, []);

  const loadInbox = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      setConversations([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tabParam =
        tab === 'inbox' ? undefined : tab === 'broadcasts' ? 'broadcasts' : tab;
      const [convRes, bcRes] = await Promise.all([
        listChatConversations({
          module,
          tab: tabParam,
          q: q.trim() || undefined,
          limit: 80,
        }),
        listChatBroadcasts({ limit: 40 }),
      ]);
      setConversations(convRes.items);
      setBroadcasts(bcRes.items);
      if (selectedId && !convRes.items.some((c) => c.id === selectedId)) {
        setSelectedId(convRes.items[0]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [apiOn, module, tab, q, selectedId]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  const openThread = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setThreadLoading(true);
      try {
        const data = await listChatMessages(id, { limit: 100 });
        setMessages(data.items);
        upsertConversation(data.conversation);
        joinChatConversation(id);
        await markChatRead(id);
        upsertConversation({ ...data.conversation, unread: 0 });
        void refreshUnread();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Could not load messages');
        setMessages([]);
      } finally {
        setThreadLoading(false);
      }
    },
    [upsertConversation, refreshUnread],
  );

  useEffect(() => {
    if (!apiOn) return;
    const unsub = subscribeChatSocket({
      onMessage: ({ conversation, message }) => {
        upsertConversation(conversation);
        if (message.conversationId === selectedId) {
          setMessages((prev) => appendMessage(prev, message));
        }
      },
      onConversationUpdated: ({ conversation }) => {
        upsertConversation(conversation);
      },
      onBroadcast: (b) => {
        setBroadcasts((prev) => [b, ...prev.filter((x) => x.id !== b.id)]);
        toast.message(`Broadcast: ${b.target}`, { description: b.message.slice(0, 120) });
      },
    });
    return unsub;
  }, [apiOn, selectedId, upsertConversation]);

  useEffect(() => {
    if (!apiOn || !threadParam || openedThreadRef.current === threadParam) return;
    openedThreadRef.current = threadParam;
    void openThread(threadParam);
  }, [apiOn, threadParam, openThread]);

  const send = async () => {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    try {
      const data = await sendChatMessage(selectedId, {
        text: draft.trim(),
        urgent: urgentSend,
      });
      setMessages((prev) => appendMessage(prev, data.message));
      upsertConversation(data.conversation);
      setDraft('');
      setUrgentSend(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const directoryModule = GROUP_TO_CHAT_MODULE[newGroup as keyof typeof GROUP_TO_CHAT_MODULE];

  const openNewDialog = async () => {
    setNewOpen(true);
    try {
      const dir = await listChatDirectory({
        q: dirQ || undefined,
        module: directoryModule,
        limit: 50,
      });
      setDirectory(dir.items);
    } catch {
      setDirectory([]);
    }
  };

  useEffect(() => {
    if (!newOpen) return;
    const t = window.setTimeout(() => {
      void listChatDirectory({
        q: dirQ || undefined,
        module: directoryModule,
        limit: 50,
      })
        .then((d) => setDirectory(d.items))
        .catch(() => setDirectory([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [dirQ, newOpen, directoryModule, newGroup]);

  const createConversation = async () => {
    if (!newPeerId && newType === 'direct') {
      toast.error('Select a staff member');
      return;
    }
    if (!newTitle.trim() && !newPeerId) {
      toast.error('Enter a title');
      return;
    }
    setCreating(true);
    try {
      const peer = directory.find((d) => String(d.userId) === newPeerId);
      const title =
        newTitle.trim() ||
        peer?.displayName ||
        (newType === 'patient' ? newPatientName || 'Patient thread' : 'Conversation');
      const data = await createChatConversation({
        type: newType,
        group: newGroup,
        title,
        participantUserIds: newPeerId ? [Number(newPeerId)] : [],
        patientName: newType === 'patient' ? newPatientName || undefined : undefined,
        hospitalNo: newType === 'patient' ? newHospitalNo || undefined : undefined,
        urgent: false,
        initialMessage: newInitial.trim() || undefined,
      });
      upsertConversation(data.conversation);
      setNewOpen(false);
      setNewTitle('');
      setNewInitial('');
      setNewPeerId('');
      setSelectedId(data.conversation.id);
      joinChatConversation(data.conversation.id);
      if (data.message) {
        setMessages([data.message]);
        await markChatRead(data.conversation.id);
        upsertConversation({ ...data.conversation, unread: 0 });
        void refreshUnread();
      } else {
        await openThread(data.conversation.id);
      }
      toast.success('Conversation started');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create conversation');
    } finally {
      setCreating(false);
    }
  };

  const sendBroadcast = async () => {
    if (!bcMessage.trim()) {
      toast.error('Enter a broadcast message');
      return;
    }
    setCreating(true);
    try {
      const { broadcast } = await createChatBroadcast({
        target: bcTarget,
        priority: bcPriority,
        message: bcMessage.trim(),
        moduleScope: [module],
      });
      setBroadcasts((prev) => [broadcast, ...prev]);
      setBroadcastOpen(false);
      setBcMessage('');
      toast.success('Broadcast sent');
      void loadInbox();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not send broadcast');
    } finally {
      setCreating(false);
    }
  };

  const archiveSelected = async () => {
    if (!selectedId) return;
    try {
      const { conversation } = await archiveChatConversation(selectedId);
      upsertConversation(conversation);
      setSelectedId(null);
      setMessages([]);
      toast.success('Conversation archived');
      void loadInbox();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not archive');
    }
  };

  const kpis = useMemo(() => {
    const unread = conversations.reduce((s, c) => s + (c.unread || 0), 0);
    const urgent = conversations.filter((c) => c.urgent && !c.archived).length;
    const patient = conversations.filter((c) => c.type === 'patient' && !c.archived).length;
    const department = conversations.filter((c) => c.type === 'department' && !c.archived).length;
    return { unread, urgent, patient, department, broadcasts: broadcasts.length };
  }, [conversations, broadcasts]);

  return (
    <DashboardLayout navItems={navItems} title={shellTitle}>
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Communication Center</h2>
            <p className="text-sm text-muted-foreground">
              Real-time staff messaging across clinical and operational modules.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => void loadInbox()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBroadcastOpen(true)} disabled={!apiOn}>
            <Megaphone className="h-4 w-4 mr-1" /> Broadcast
          </Button>
          <Button size="sm" onClick={() => void openNewDialog()} disabled={!apiOn}>
            <Plus className="h-4 w-4 mr-1" /> New Message
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <SummaryCard title="Unread" value={String(kpis.unread)} icon={Bell} />
        <SummaryCard title="Urgent" value={String(kpis.urgent)} icon={AlertTriangle} />
        <SummaryCard title="Patient-linked" value={String(kpis.patient)} icon={Users} />
        <SummaryCard title="Department" value={String(kpis.department)} icon={Radio} />
        <SummaryCard title="Broadcasts" value={String(kpis.broadcasts)} icon={Megaphone} />
      </div>

      {!apiOn ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL to enable live chat.
        </Card>
      ) : (
        <>
          <Card className="p-3 mb-4">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search conversations…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void loadInbox();
                  }}
                />
              </div>
              <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="inbox">Inbox</TabsTrigger>
                  <TabsTrigger value="department">Department</TabsTrigger>
                  <TabsTrigger value="patient">Patient</TabsTrigger>
                  <TabsTrigger value="urgent">Urgent</TabsTrigger>
                  <TabsTrigger value="broadcasts">Broadcasts</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </Card>

          {error && (
            <Card className="mb-4 p-4 border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={() => void loadInbox()}>
                Retry
              </Button>
            </Card>
          )}

          {tab === 'broadcasts' ? (
            <Card className="p-4">
              {loading ? (
                <div className="flex justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading broadcasts…
                </div>
              ) : broadcasts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">No broadcasts yet.</p>
              ) : (
                <div className="space-y-3">
                  {broadcasts.map((b) => (
                    <div key={b.id} className="border rounded-lg p-3">
                      <div className="flex justify-between gap-2 flex-wrap">
                        <div className="font-medium text-sm">{b.target}</div>
                        <Badge variant="outline">{b.priority}</Badge>
                      </div>
                      <p className="text-sm mt-1">{b.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {b.sentBy} · {timeLabel(b.sentAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <div className="grid lg:grid-cols-[260px_1fr_240px] gap-4 min-h-[520px]">
              <Card className="p-2 overflow-auto max-h-[70vh]">
                {loading ? (
                  <div className="flex justify-center py-10 text-muted-foreground gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10 px-2">
                    No conversations. Start a new message.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => void openThread(c.id)}
                        className={`w-full text-left p-2.5 rounded-lg border transition ${
                          selectedId === c.id ? 'border-primary bg-primary/5' : 'hover:border-primary/40'
                        }`}
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium text-sm truncate">{c.title}</span>
                          {c.unread > 0 && (
                            <Badge className="shrink-0 h-5 px-1.5">{c.unread}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                          {c.group}
                          {c.urgent && (
                            <Badge variant="outline" className="ml-1 text-[10px] border-amber-300 text-amber-800">
                              URGENT
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {c.lastMessage || '—'}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {timeLabel(c.lastMessageAt)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="flex flex-col max-h-[70vh]">
                {!selected ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8">
                    Select a conversation
                  </div>
                ) : (
                  <>
                    <div className="p-3 border-b flex justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-semibold text-sm">{selected.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {selected.group}
                          {selected.patientName
                            ? ` · ${selected.patientName} (${selected.hospitalNo ?? '—'})`
                            : ''}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {selected.patientName && onOpenPatient && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onOpenPatient({
                                patientId: selected.patientId,
                                patientName: selected.patientName,
                                hospitalNo: selected.hospitalNo,
                              })
                            }
                          >
                            Patient
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => void archiveSelected()}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto p-3 space-y-2">
                      {threadLoading ? (
                        <div className="flex justify-center py-10 text-muted-foreground gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
                        </div>
                      ) : messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-10">
                          No messages yet. Say hello.
                        </p>
                      ) : (
                        messages.map((m) => {
                          const me =
                            Boolean(user?.id) &&
                            String(m.senderUserId) === String(user!.id);
                          return (
                            <div
                              key={m.id}
                              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                                me
                                  ? 'ml-auto bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              } ${m.urgent ? 'ring-2 ring-amber-400' : ''}`}
                            >
                              {!me && (
                                <div className="text-[10px] opacity-80 mb-0.5">{m.senderName}</div>
                              )}
                              <div>{m.text}</div>
                              <div className={`text-[10px] mt-1 ${me ? 'opacity-80' : 'text-muted-foreground'}`}>
                                {timeLabel(m.createdAt)}
                                {m.urgent ? ' · Urgent' : ''}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="p-3 border-t space-y-2">
                      <Textarea
                        rows={2}
                        value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          if (selectedId) emitChatTyping(selectedId);
                        }}
                        placeholder="Type a message…"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void send();
                          }
                        }}
                      />
                      <div className="flex justify-between items-center gap-2">
                        <label className="text-xs flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={urgentSend}
                            onChange={(e) => setUrgentSend(e.target.checked)}
                          />
                          Mark urgent
                        </label>
                        <Button size="sm" onClick={() => void send()} disabled={sending || !draft.trim()}>
                          {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Send
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>

              <Card className="p-3 overflow-auto max-h-[70vh] hidden lg:block">
                <div className="text-xs font-semibold mb-2">Context</div>
                {selected ? (
                  <div className="space-y-3 text-sm">
                    {selected.patientName ? (
                      <div>
                        <div className="text-xs text-muted-foreground">Linked patient</div>
                        <div className="font-medium">{selected.patientName}</div>
                        <div className="text-xs text-muted-foreground">{selected.hospitalNo}</div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No patient linked</p>
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground">Participants</div>
                      <div className="text-xs mt-1">
                        {selected.participantUserIds.length} user(s)
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Modules</div>
                      <div className="text-xs mt-1">{selected.moduleScope.join(', ') || module}</div>
                    </div>
                    <p className="text-[10px] text-muted-foreground border-t pt-2">
                      Messages are stored in MongoDB (HMS) and delivered in real time over WebSocket.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Select a thread for context.</p>
                )}
              </Card>
            </div>
          )}
        </>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>Start a staff conversation from the directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as typeof newType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="patient">Patient-linked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Group</Label>
              <Select
                value={newGroup}
                onValueChange={(v) => {
                  setNewGroup(v);
                  setNewPeerId('');
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHAT_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Find staff</Label>
              <Input value={dirQ} onChange={(e) => setDirQ(e.target.value)} placeholder="Name or email…" />
              <Select value={newPeerId} onValueChange={setNewPeerId}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Select recipient" /></SelectTrigger>
                <SelectContent>
                  {directory.map((d) => (
                    <SelectItem key={d.userId} value={String(d.userId)}>
                      {d.displayName} {d.role ? `(${d.role})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Title (optional)</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            {newType === 'patient' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Patient name</Label>
                  <Input value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Hospital no</Label>
                  <Input value={newHospitalNo} onChange={(e) => setNewHospitalNo(e.target.value)} />
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs">First message (optional)</Label>
              <Textarea rows={2} value={newInitial} onChange={(e) => setNewInitial(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={() => void createConversation()} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emergency / Department Broadcast</DialogTitle>
            <DialogDescription>Notify subscribed modules in real time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Target</Label>
              <Input value={bcTarget} onChange={(e) => setBcTarget(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={bcPriority} onValueChange={(v) => setBcPriority(v as typeof bcPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea rows={3} value={bcMessage} onChange={(e) => setBcMessage(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
            <Button onClick={() => void sendBroadcast()} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Send Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default StaffCommunicationCenter;
