import { useState, useEffect, useMemo, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MessageCircle, Send, Paperclip, Search, X, Tag } from 'lucide-react';
import { useRecordsChatFab } from '@/hooks/useRecordsChatFab';

type StaffMember = { id: string; name: string; role: string; department: string; online: boolean };
type ChatMessage = { id: string; from: string; text: string; time: string; me?: boolean; patientRef?: string };
type Conversation = { id: string; staffId: string; unread: number; lastMessage: string; lastTime: string; messages: ChatMessage[] };

const DEPARTMENTS = ['All', 'Records', 'Nursing', 'Doctors', 'Pharmacy', 'Laboratory', 'Radiology', 'Accounts', 'NHIA/HMO', 'Admin'];

const STAFF: StaffMember[] = [
  { id: 's1', name: 'Adebola Oduwole', role: 'Records Officer', department: 'Records', online: true },
  { id: 's2', name: 'Tunde Akinyemi', role: 'Records Supervisor', department: 'Records', online: true },
  { id: 's3', name: 'Blessing Okonkwo', role: 'Staff Nurse', department: 'Nursing', online: true },
  { id: 's4', name: 'Adaeze Nwankwo', role: 'Senior Nurse', department: 'Nursing', online: false },
  { id: 's5', name: 'Dr. Okafor Bello', role: 'Consultant Psychiatrist', department: 'Doctors', online: true },
  { id: 's6', name: 'Dr. Funmi Adewale', role: 'Medical Officer', department: 'Doctors', online: false },
  { id: 's7', name: 'Pharm. Tunde Ibrahim', role: 'Chief Pharmacist', department: 'Pharmacy', online: true },
  { id: 's8', name: 'Pharm. Chioma Eze', role: 'Dispensing Pharmacist', department: 'Pharmacy', online: true },
  { id: 's9', name: 'Mr. Emeka Obi', role: 'Lab Scientist', department: 'Laboratory', online: true },
  { id: 's10', name: 'Mrs. Fatima Yusuf', role: 'Lab Technician', department: 'Laboratory', online: false },
  { id: 's11', name: 'Mr. Segun Adeyemi', role: 'Radiographer', department: 'Radiology', online: true },
  { id: 's12', name: 'Mrs. Ngozi Okafor', role: 'Accounts Officer', department: 'Accounts', online: true },
  { id: 's13', name: 'Mr. Ibrahim Musa', role: 'HMO Desk Officer', department: 'NHIA/HMO', online: false },
  { id: 's14', name: 'Mrs. Hauwa Garba', role: 'NHIA Claims Officer', department: 'NHIA/HMO', online: true },
  { id: 's15', name: 'Mr. Chidi Eze', role: 'Hospital Administrator', department: 'Admin', online: true },
];

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', staffId: 's3', unread: 2, lastMessage: 'Bed B-04 ready for admission.', lastTime: '09:14',
    messages: [
      { id: 'm1', from: 'Blessing Okonkwo', text: 'Please confirm bed allocation for John Doe.', time: '09:10' },
      { id: 'm2', from: 'Blessing Okonkwo', text: 'Bed B-04 ready for admission.', time: '09:14' },
    ],
  },
  {
    id: 'c2', staffId: 's5', unread: 1, lastMessage: 'Discharge summary signed.', lastTime: '08:52',
    messages: [
      { id: 'm3', from: 'Dr. Okafor Bello', text: 'Funke Adeyemi discharge approved — please process records.', time: '08:48', patientRef: 'GFA HMS/2026/00148' },
      { id: 'm4', from: 'Dr. Okafor Bello', text: 'Discharge summary signed.', time: '08:52', patientRef: 'GFA HMS/2026/00148' },
    ],
  },
  {
    id: 'c3', staffId: 's7', unread: 0, lastMessage: 'Medication chart updated.', lastTime: 'Yesterday',
    messages: [
      { id: 'm5', from: 'Pharm. Tunde Ibrahim', text: 'Medication chart updated for ward 3B.', time: '16:30' },
    ],
  },
];

function chatAudit(action: string) {
  try {
    const k = 'gfa_records_audit_v1';
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    arr.unshift({ action: `[Chat] ${action}`, timestamp: new Date().toISOString() });
    localStorage.setItem(k, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
}

export default function RecordsStaffChat() {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string | null>('c1');
  const [draft, setDraft] = useState('');
  const [patientRef, setPatientRef] = useState('');
  const [showPatientTag, setShowPatientTag] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [view, setView] = useState<'conversations' | 'staff'>('conversations');
  const fab = useRecordsChatFab();

  const totalUnread = useMemo(() => conversations.reduce((a, c) => a + c.unread, 0), [conversations]);

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;
  const activeStaff = activeConv ? STAFF.find(s => s.id === activeConv.staffId) : null;

  const filteredStaff = useMemo(() => STAFF.filter(s => {
    if (deptFilter !== 'All' && s.department !== deptFilter) return false;
    if (staffSearch && !`${s.name} ${s.role} ${s.department}`.toLowerCase().includes(staffSearch.toLowerCase())) return false;
    return true;
  }), [deptFilter, staffSearch]);

  const openConversation = useCallback((staffId: string) => {
    const existing = conversations.find(c => c.staffId === staffId);
    if (existing) {
      setActiveConvId(existing.id);
      setConversations(prev => prev.map(c => c.id === existing.id ? { ...c, unread: 0 } : c));
    } else {
      const staff = STAFF.find(s => s.id === staffId)!;
      const newConv: Conversation = {
        id: `c${Date.now()}`, staffId, unread: 0, lastMessage: 'Start a conversation', lastTime: 'Now', messages: [],
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      chatAudit(`Started conversation with ${staff.name} (${staff.department})`);
    }
    setView('conversations');
  }, [conversations]);

  const sendMessage = () => {
    if (!draft.trim() || !activeConv) return;
    const staff = STAFF.find(s => s.id === activeConv.staffId);
    const msg: ChatMessage = {
      id: `m${Date.now()}`, from: 'You (Records)', text: draft.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), me: true,
      patientRef: showPatientTag && patientRef ? patientRef : undefined,
    };
    setConversations(prev => prev.map(c => c.id === activeConv.id
      ? { ...c, messages: [...c.messages, msg], lastMessage: msg.text, lastTime: msg.time }
      : c));
    chatAudit(`Message sent to ${staff?.name ?? 'staff'}: "${draft.trim().slice(0, 60)}${draft.length > 60 ? '…' : ''}"`);
    setDraft('');
    setShowPatientTag(false);
    setPatientRef('');
    toast.success('Message sent');

    setTimeout(() => {
      if (!staff) return;
      const reply: ChatMessage = {
        id: `m${Date.now() + 1}`, from: staff.name,
        text: `Acknowledged. I'll follow up shortly, ${staff.role.split(' ').pop()}.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setConversations(prev => prev.map(c => c.staffId === staff.id
        ? { ...c, messages: [...c.messages, reply], lastMessage: reply.text, lastTime: reply.time, unread: open ? c.unread : c.unread + 1 }
        : c));
      if (!open) {
        toast.info(`New message from ${staff.name}`, { description: reply.text });
      }
    }, 2500);
  };

  useEffect(() => {
    if (open && activeConvId) {
      setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, unread: 0 } : c));
    }
  }, [open, activeConvId]);

  const handleFabClick = () => {
    if (!fab.consumeTap()) return;
    setOpen(true);
  };

  const handleHide = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    fab.hide();
    chatAudit('Staff chat FAB hidden');
    toast.message('Staff chat hidden', { description: 'Use the Chat tab on the edge to restore.' });
  };

  const handleRestore = () => {
    fab.show();
    chatAudit('Staff chat FAB restored');
  };

  return (
    <>
      {fab.hidden ? (
        <button
          type="button"
          onClick={handleRestore}
          className="fixed z-50 right-0 top-1/2 -translate-y-1/2 rounded-l-md bg-primary text-primary-foreground shadow-md px-1.5 py-3 text-[10px] font-semibold tracking-wide hover:bg-primary/90"
          style={{ writingMode: 'vertical-rl' }}
          title="Show staff chat"
        >
          Chat
          {totalUnread > 0 && (
            <span className="mt-1 inline-flex h-4 min-w-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] items-center justify-center">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>
      ) : (
        <div
          className={`fixed z-50 group ${fab.dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ left: fab.pos.x, top: fab.pos.y, width: fab.fabSize, height: fab.fabSize, touchAction: 'none' }}
          onPointerDown={fab.onPointerDown}
          onPointerMove={fab.onPointerMove}
          onPointerUp={fab.onPointerUp}
          onPointerCancel={fab.onPointerUp}
        >
          <button
            type="button"
            onClick={handleFabClick}
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-transform hover:scale-105 relative"
            title="Staff Chat · Drag to move · X to hide"
          >
            <MessageCircle className="h-6 w-6 pointer-events-none" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleHide}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute -top-1.5 -left-1.5 h-6 w-6 rounded-full bg-muted text-muted-foreground border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity"
            title="Hide chat"
            aria-label="Hide staff chat"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="flex items-center justify-between">
              <span>Records Staff Chat</span>
              {totalUnread > 0 && <Badge variant="destructive">{totalUnread} unread</Badge>}
            </SheetTitle>
          </SheetHeader>

          <div className="flex border-b text-sm">
            <button type="button" onClick={() => setView('conversations')}
              className={`flex-1 py-2 font-medium ${view === 'conversations' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>
              Conversations
            </button>
            <button type="button" onClick={() => setView('staff')}
              className={`flex-1 py-2 font-medium ${view === 'staff' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>
              Staff Directory
            </button>
          </div>

          {view === 'staff' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 space-y-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8 h-9" placeholder="Search staff…" value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} />
                </div>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <ul className="flex-1 overflow-y-auto divide-y">
                {filteredStaff.map(s => (
                  <li key={s.id}>
                    <button type="button" onClick={() => openConversation(s.id)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3">
                      <div className="relative">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background ${s.online ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.role} · {s.department}</div>
                      </div>
                      <span className={`text-[10px] ${s.online ? 'text-emerald-600' : 'text-muted-foreground'}`}>{s.online ? 'Online' : 'Offline'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {!activeConv ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                  Select a conversation or browse staff to start chatting.
                </div>
              ) : (
                <>
                  <div className="px-4 py-2 border-b flex items-center gap-2 bg-muted/30">
                    <div className="relative">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                        {activeStaff?.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      {activeStaff && (
                        <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-background ${activeStaff.online ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{activeStaff?.name}</div>
                      <div className="text-xs text-muted-foreground">{activeStaff?.role} · {activeStaff?.department}</div>
                    </div>
                  </div>

                  <div className="px-2 py-2 border-b max-h-24 overflow-y-auto">
                    <div className="flex gap-1 flex-wrap">
                      {conversations.map(c => {
                        const st = STAFF.find(s => s.id === c.staffId);
                        return (
                          <button key={c.id} type="button" onClick={() => { setActiveConvId(c.id); setConversations(prev => prev.map(x => x.id === c.id ? { ...x, unread: 0 } : x)); }}
                            className={`text-left px-2 py-1 rounded-md text-xs border truncate max-w-[140px] ${c.id === activeConvId ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}>
                            {st?.name.split(' ')[0]}
                            {c.unread > 0 && <span className="ml-1 text-destructive font-bold">({c.unread})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
                    {activeConv.messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Say hello!</p>
                    ) : activeConv.messages.map(m => (
                      <div key={m.id} className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.me ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {!m.me && <div className="text-[10px] opacity-70 mb-0.5">{m.from} · {m.time}</div>}
                          {m.me && <div className="text-[10px] opacity-70 mb-0.5 text-right">{m.time}</div>}
                          <div>{m.text}</div>
                          {m.patientRef && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] opacity-80">
                              <Tag className="h-3 w-3" /> {m.patientRef}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 border-t space-y-2">
                    {showPatientTag && (
                      <div className="flex items-center gap-2">
                        <Input className="h-8 text-xs" placeholder="Patient ref (hospital no.)" value={patientRef} onChange={(e) => setPatientRef(e.target.value)} />
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setShowPatientTag(false); setPatientRef(''); }}><X className="h-4 w-4" /></Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" className="shrink-0" title="Attach file" onClick={() => toast.info('File attachment — coming soon')}><Paperclip className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" className="shrink-0" title="Patient reference tag" onClick={() => setShowPatientTag(v => !v)}><Tag className="h-4 w-4" /></Button>
                      <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message…" className="flex-1" />
                      <Button size="icon" onClick={sendMessage} disabled={!draft.trim()}><Send className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
