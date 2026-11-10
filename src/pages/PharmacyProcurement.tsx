import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { LoadingButton } from '@/components/LoadingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  LayoutDashboard, ClipboardList, Boxes, Send, Package, CreditCard, RotateCcw, Stethoscope,
  FileText, AlertTriangle, Activity, TrendingUp, ShieldCheck, Edit, Loader2,
  Plus, FilePlus, PackagePlus, Truck, UserPlus, Download, Printer, Eye, Check, X,
  Building2, History, Search, ChevronsUpDown, Pill,
} from 'lucide-react';
import { drugCatalog } from '@/data/pharmacyData';
import { formatCurrency } from '@/data/dummyData';
import {
  isPharmacyApiEnabled,
  listSuppliers, createSupplier, updateSupplier,
  listDrugs,
  listPurchaseRequests, createPurchaseRequest, approvePurchaseRequest, rejectPurchaseRequest,
  listPurchaseOrders, createPurchaseOrder, approvePurchaseOrder, sendPurchaseOrder,
  listGrns, receiveStock, listReceivableOrders, getProcurementHistory,
  type ProcurementHistoryCards, type ProcurementHistoryItem,
} from '@/lib/api/pharmacy';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  PharmacyReceiveStockModal,
  mapApiPo,
  isReceivablePo,
  monthToIso,
  dateOnly,
  monthOnly,
  scrollModalClass,
  type ReceivePOItem,
  type ReceivePurchaseOrder,
} from '@/components/PharmacyReceiveStockModal';

// ---------- Sidebar (shared shape with PharmacyModule) ----------
const pharmacyNav = [
  { label: 'Dashboard',          path: '/pharmacy',                        icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Prescriptions',      path: '/pharmacy/queue',                  icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Inventory',          path: '/pharmacy/inventory',              icon: <Boxes className="h-4 w-4" /> },
  { label: 'Drug Catalog',       path: '/pharmacy/drugs',                  icon: <Pill className="h-4 w-4" /> },
  { label: 'Procurement',        path: '/pharmacy/procurement',            icon: <Send className="h-4 w-4" /> },
  { label: 'Inpatient Pharmacy', path: '/pharmacy/inpatient',    icon: <Package className="h-4 w-4" /> },
  { label: 'Revenue / Billing',  path: '/pharmacy/billing',      icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Returns',            path: '/pharmacy/returns',      icon: <RotateCcw className="h-4 w-4" /> },
  { label: 'Clinical Pharmacy',  path: '/pharmacy/interactions', icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Reports',            path: '/pharmacy/reports',      icon: <FileText className="h-4 w-4" /> },
  { label: 'ADR Reporting',      path: '/dashboard/pharmacy/comms',        icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Alerts',             path: '/pharmacy/audit',                  icon: <Activity className="h-4 w-4" /> },
  { label: 'Analytics',          path: '/pharmacy/analytics',    icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'AI Features',        path: '/pharmacy/forecast',     icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Settings',           path: '/pharmacy/config',       icon: <Edit className="h-4 w-4" /> },
];

// ---------- Local view models ----------
type PRStatus = 'Draft' | 'Submitted' | 'Pending Approval' | 'Approved' | 'Rejected';
type POStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Sent to Supplier' | 'Partially Delivered' | 'Delivered' | 'Completed' | 'Cancelled';
type Priority = 'Low' | 'Normal' | 'High' | 'Critical';

interface PurchaseRequest {
  id: string; apiId?: number; drugId: string; drugName: string; category: string;
  currentStock: number; reorderLevel: number; qty: number;
  requestedBy: string; date: string; priority: Priority; status: PRStatus; reason: string;
}
type POItem = ReceivePOItem;
type PurchaseOrder = ReceivePurchaseOrder & { status: POStatus };

/** Drugs supplied are referenced by DRUG_ID — names are joined for display only. */
interface SupplierDrugRef { drugId: number; name: string; }
interface Supplier {
  id: string; apiId?: number; name: string; contact: string; phone: string; email: string;
  address: string; drugIds: number[]; drugs: SupplierDrugRef[]; performance: number;
}
interface GRN {
  id: string; apiId?: number; poNumber: string; supplier: string; drug: string; batch: string;
  mfgDate: string; expiry: string; ordered: number; received: number; damaged: number;
  accepted: number; receivedBy: string; location: string; date: string;
}
/** Drug option for pickers — API-backed when enabled, drugCatalog fallback. */
interface DrugOption {
  id: string; apiId?: number; name: string; category: string;
  stock: number; reorderLevel: number; unitPrice: number; status: string;
}

// ---------- Mock fallback (used when VITE_USE_API is off) ----------
const seedRequests: PurchaseRequest[] = [
  { id:'PR-2026-0142', drugId:'DRG004', drugName:'Metformin 500mg', category:'Antidiabetic', currentStock:0, reorderLevel:300, qty:1500, requestedBy:'Pharm. Adewale', date:'2026-06-22', priority:'Critical', status:'Pending Approval', reason:'Out of stock — diabetes clinic affected' },
  { id:'PR-2026-0141', drugId:'DRG002', drugName:'Amoxicillin 500mg', category:'Antibiotic', currentStock:320, reorderLevel:400, qty:800, requestedBy:'Pharm. Chioma', date:'2026-06-22', priority:'High', status:'Submitted', reason:'Below reorder level' },
  { id:'PR-2026-0140', drugId:'DRG008', drugName:'Diclofenac 50mg', category:'Analgesic', currentStock:95, reorderLevel:200, qty:500, requestedBy:'Pharm. Bukola', date:'2026-06-21', priority:'High', status:'Approved', reason:'Below reorder level' },
];

const seedPOs: PurchaseOrder[] = [
  { id:'PO-2026-0078', supplier:'Emzor Pharma Ltd', items:[{drugId:'DRG004',drugName:'Metformin 500mg',qty:1500,unitCost:42}], total:63000, createdBy:'Pharm. Adewale', approval:'Pending', delivery:'Not Sent', status:'Pending Approval', expectedDate:'2026-07-05', paymentTerms:'30 days net', notes:'Urgent — diabetes clinic' },
  { id:'PO-2026-0077', supplier:'Fidson Healthcare', items:[{drugId:'DRG002',drugName:'Amoxicillin 500mg',qty:800,unitCost:62}], total:49600, createdBy:'Pharm. Chioma', approval:'Approved', delivery:'Sent', status:'Sent to Supplier', expectedDate:'2026-07-02', paymentTerms:'15 days net' },
];

const seedSuppliers: Supplier[] = [
  { id:'SUP-001', name:'Emzor Pharma Ltd',   contact:'Mr. Tunde Okoro', phone:'0803 421 9001', email:'sales@emzor.com',   address:'Plot 3C, Sagamu, Ogun State', drugIds:[4,6], drugs:[{drugId:4,name:'Metformin 500mg'},{drugId:6,name:'Normal Saline 500ml'}], performance:94 },
  { id:'SUP-002', name:'Fidson Healthcare',  contact:'Mrs. Adaobi Eze', phone:'0809 110 8822', email:'orders@fidson.com', address:'Sango Otta, Ogun State',      drugIds:[2,8], drugs:[{drugId:2,name:'Amoxicillin 500mg'},{drugId:8,name:'Diclofenac 50mg'}],   performance:91 },
];

const seedGRNs: GRN[] = [
  { id:'GRN-2026-0061', poNumber:'PO-2026-0076', supplier:'May & Baker Nigeria', drug:'Diclofenac 50mg', batch:'BATCH-H22', mfgDate:'2026-04', expiry:'2028-04', ordered:500, received:300, damaged:0, accepted:300, receivedBy:'Pharm. Bukola', location:'C-3', date:'2026-06-23' },
];

const fallbackDrugOptions: DrugOption[] = drugCatalog.map(d => ({
  id: d.id, name: `${d.name} ${d.strength}`, category: d.category,
  stock: d.stock, reorderLevel: d.reorderLevel, unitPrice: d.unitPrice, status: d.status,
}));

// ---------- Helpers ----------
const priorityTone = (p: Priority) => p==='Critical' ? 'bg-rose-100 text-rose-700 border-rose-200'
  : p==='High' ? 'bg-orange-100 text-orange-700 border-orange-200'
  : p==='Normal' ? 'bg-sky-100 text-sky-700 border-sky-200'
  : 'bg-muted text-foreground border-border';

const statusTone = (s: string): string => {
  if (['Approved','Delivered','Completed','Sent'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (['Pending Approval','Pending','Submitted'].includes(s)) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (['Partially Delivered','Partial','Sent to Supplier'].includes(s)) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (['Rejected','Cancelled'].includes(s)) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (['Draft','Not Sent'].includes(s)) return 'bg-muted text-foreground border-border';
  return 'bg-blue-100 text-blue-700 border-blue-200';
};

const errMessage = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : fallback;

const submitDelay = () => new Promise<void>(r => setTimeout(r, 350));

// ============================================================
// PAGE
// ============================================================
export default function PharmacyProcurement() {
  const navigate = useNavigate();
  const useApi = isPharmacyApiEnabled();
  const { user } = useAuth();
  const receiverName = user?.name?.trim() || user?.email || 'Pharmacist';

  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [drugOptions, setDrugOptions] = useState<DrugOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('requests');
  const [q, setQ] = useState('');
  const [recvTargetId, setRecvTargetId] = useState<string | null>(null);
  const [historyCards, setHistoryCards] = useState<ProcurementHistoryCards | null>(null);
  const [historyItems, setHistoryItems] = useState<ProcurementHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modal open states
  const [prOpen, setPrOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [recvOpen, setRecvOpen] = useState(false);
  const [supOpen, setSupOpen] = useState(false);
  const [editSup, setEditSup] = useState<Supplier|null>(null);
  const [viewPR, setViewPR] = useState<PurchaseRequest|null>(null);
  const [viewPO, setViewPO] = useState<PurchaseOrder|null>(null);
  const [viewSup, setViewSup] = useState<Supplier|null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const isBusy = (key: string) => busy === key;
  const runBusy = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  const loadAll = useCallback(async () => {
    if (!useApi) {
      setRequests([]);
      setPOs([]);
      setSuppliers([]);
      setGRNs([]);
      setDrugOptions([]);
      setLoading(false);
      toast.error('Backend API is not configured');
      return;
    }
    setLoading(true);
    try {
      const [sup, drugs, prs, orders, receipts, receivable] = await Promise.all([
        listSuppliers({ limit: 100 }),
        listDrugs({ limit: 200 }),
        listPurchaseRequests({ limit: 100 }),
        listPurchaseOrders({ limit: 100 }),
        listGrns({ limit: 100 }),
        listReceivableOrders({ limit: 100 }),
      ]);
      setSuppliers(sup.items.map(s => ({
        id: `SUP-${String(s.supplierId).padStart(3, '0')}`, apiId: s.supplierId,
        name: s.name, contact: s.contactPerson ?? '—', phone: s.phone ?? '—',
        email: s.email ?? '—', address: s.address ?? '—',
        drugIds: s.drugIds, drugs: s.drugs, performance: s.performance,
      })));
      setDrugOptions(drugs.items.map(d => ({
        id: String(d.drugId), apiId: d.drugId,
        name: [d.name, d.strength].filter(Boolean).join(' '),
        category: d.category ?? '—', stock: d.stock, reorderLevel: d.reorderLevel,
        unitPrice: d.unitPrice, status: d.stockStatus,
      })));
      setRequests(prs.items.map(r => ({
        id: r.requestNo, apiId: r.requestId, drugId: String(r.drugId), drugName: r.drugName,
        category: r.category ?? '—', currentStock: r.currentStock, reorderLevel: r.reorderLevel,
        qty: r.qty, requestedBy: r.requestedBy ?? '—', date: dateOnly(r.createdAt),
        priority: r.priority as Priority, status: r.status as PRStatus, reason: r.reason ?? '—',
      })));
      // Merge all POs with receivable list so dropdown always has approved orders.
      const byId = new Map<number, ReturnType<typeof mapApiPo>>();
      for (const p of orders.items) byId.set(p.poId, mapApiPo(p));
      for (const p of receivable.items) byId.set(p.poId, mapApiPo(p));
      setPOs([...byId.values()]);
      setGRNs(receipts.items.map(g => ({
        id: g.grnNo, apiId: g.grnId, poNumber: g.poNo ?? '—', supplier: g.supplierName ?? '—',
        drug: g.drugName, batch: g.batchNo, mfgDate: monthOnly(g.mfgDate), expiry: monthOnly(g.expiryDate),
        ordered: g.qtyOrdered, received: g.qtyReceived, damaged: g.qtyDamaged, accepted: g.qtyAccepted,
        receivedBy: g.receivedBy ?? '—', location: g.location ?? '—', date: dateOnly(g.receivedAt),
      })));
    } catch (e) {
      toast.error(errMessage(e, 'Could not load procurement data'));
    } finally {
      setLoading(false);
    }
  }, [useApi]);

  const loadHistory = useCallback(async () => {
    if (!useApi) {
      setHistoryCards(null);
      setHistoryItems([]);
      toast.error('Backend API is not configured');
      return;
    }
    setHistoryLoading(true);
    try {
      const data = await getProcurementHistory({ q: q || undefined, limit: 100 });
      setHistoryCards(data.cards);
      setHistoryItems(data.items);
    } catch (e) {
      toast.error(errMessage(e, 'Could not load procurement history'));
    } finally {
      setHistoryLoading(false);
    }
  }, [useApi, q]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  useEffect(() => {
    if (tab === 'history') void loadHistory();
  }, [tab, loadHistory]);

  const openReceive = (po?: PurchaseOrder) => {
    setRecvTargetId(po?.id ?? null);
    setRecvOpen(true);
  };

  // Auto-suggested low stock items
  const lowStockSuggestions = useMemo(
    () => drugOptions.filter(d => d.status === 'Low' || d.status === 'Out of Stock'),
    [drugOptions]
  );

  // Summary metrics
  const pendingRequests = requests.filter(r => ['Submitted','Pending Approval'].includes(r.status)).length;
  const awaitingApproval = pos.filter(p => p.approval === 'Pending').length;
  const sentToSuppliers = pos.filter(p => p.delivery === 'Sent').length;
  const partial = pos.filter(p => p.delivery === 'Partial').length;
  const completed = pos.filter(p => p.status === 'Completed').length;
  const totalValue = pos.filter(p => p.status !== 'Cancelled').reduce((s,p) => s + p.total, 0);
  const lowStockCount = lowStockSuggestions.length;

  const summary = [
    { tone:'amber',  title:'Pending Purchase Requests', value:String(pendingRequests), icon:ClipboardList, sub:'Awaiting submission/approval' },
    { tone:'indigo', title:'POs Awaiting Approval',     value:String(awaitingApproval),icon:FilePlus,      sub:'Need sign-off' },
    { tone:'blue',   title:'Orders Sent to Suppliers',  value:String(sentToSuppliers), icon:Send,          sub:'In transit' },
    { tone:'amber',  title:'Partially Delivered',       value:String(partial),         icon:Truck,         sub:'Awaiting balance' },
    { tone:'green',  title:'Completed Orders',          value:String(completed),       icon:Check,         sub:'Fully received' },
    { tone:'purple', title:'Total Procurement Value',   value:formatCurrency(totalValue), icon:TrendingUp, sub:'All open POs' },
    { tone:'rose',   title:'Low Stock — Reorder',       value:String(lowStockCount),   icon:AlertTriangle, sub:'Auto-suggested' },
    { tone:'blue',   title:'Suppliers',                 value:String(suppliers.length),icon:Building2,     sub:'Active partners' },
  ];

  // ---------- Filters ----------
  const filteredRequests = requests.filter(r => !q || `${r.id} ${r.drugName} ${r.requestedBy}`.toLowerCase().includes(q.toLowerCase()));
  const filteredPOs = pos.filter(p => !q || `${p.id} ${p.supplier}`.toLowerCase().includes(q.toLowerCase()));

  // ---------- Actions ----------
  const approvePR = async (r: PurchaseRequest) => {
    if (useApi && r.apiId != null) {
      try {
        await approvePurchaseRequest(r.apiId);
        setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status:'Approved' } : x));
        toast.success(`${r.id} approved`, { description:'Logged to audit trail.' });
      } catch (e) { toast.error(errMessage(e, 'Approval failed')); }
      return;
    }
    await submitDelay();
    setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status:'Approved' } : x));
    toast.success(`${r.id} approved`, { description:'Logged to audit trail.' });
  };

  const rejectPR = async (r: PurchaseRequest) => {
    if (useApi && r.apiId != null) {
      try {
        await rejectPurchaseRequest(r.apiId);
        setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status:'Rejected' } : x));
        toast(`${r.id} rejected`, { description:'Requester has been notified.' });
      } catch (e) { toast.error(errMessage(e, 'Rejection failed')); }
      return;
    }
    await submitDelay();
    setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status:'Rejected' } : x));
    toast(`${r.id} rejected`, { description:'Requester has been notified.' });
  };

  const approvePO = async (p: PurchaseOrder) => {
    if (useApi && p.apiId != null) {
      try {
        await approvePurchaseOrder(p.apiId);
        setPOs(prev => prev.map(x => x.id === p.id ? { ...x, approval:'Approved', status:'Approved' } : x));
        toast.success(`${p.id} approved`);
      } catch (e) { toast.error(errMessage(e, 'Approval failed')); }
      return;
    }
    await submitDelay();
    setPOs(prev => prev.map(x => x.id === p.id ? { ...x, approval:'Approved', status:'Approved' } : x));
    toast.success(`${p.id} approved`);
  };

  const sendPO = async (p: PurchaseOrder) => {
    if (useApi && p.apiId != null) {
      try {
        await sendPurchaseOrder(p.apiId);
        setPOs(prev => prev.map(x => x.id === p.id ? { ...x, delivery:'Sent', status:'Sent to Supplier' } : x));
        toast.success(`${p.id} sent to supplier`);
      } catch (e) { toast.error(errMessage(e, 'Send failed')); }
      return;
    }
    await submitDelay();
    setPOs(prev => prev.map(x => x.id === p.id ? { ...x, delivery:'Sent', status:'Sent to Supplier' } : x));
    toast.success(`${p.id} sent to supplier`);
  };

  const createPR = async (input: { drug: DrugOption; qty: number; priority: Priority; reason: string; note: string; requestedBy: string }): Promise<boolean> => {
    if (useApi && input.drug.apiId != null) {
      try {
        const created = await createPurchaseRequest({
          drugId: input.drug.apiId, qty: input.qty, priority: input.priority,
          reason: input.reason || undefined, note: input.note || undefined,
          requestedBy: input.requestedBy || undefined,
        });
        setRequests(prev => [{
          id: created.requestNo, apiId: created.requestId, drugId: String(created.drugId),
          drugName: created.drugName, category: created.category ?? '—',
          currentStock: created.currentStock, reorderLevel: created.reorderLevel,
          qty: created.qty, requestedBy: created.requestedBy ?? '—', date: dateOnly(created.createdAt),
          priority: created.priority as Priority, status: created.status as PRStatus, reason: created.reason ?? '—',
        }, ...prev]);
        toast.success(`${created.requestNo} created`);
        return true;
      } catch (e) { toast.error(errMessage(e, 'Could not create purchase request')); return false; }
    }
    await submitDelay();
    const local: PurchaseRequest = {
      id: `PR-2026-${String(Math.floor(Math.random()*9000)+1000)}`,
      drugId: input.drug.id, drugName: input.drug.name, category: input.drug.category,
      currentStock: input.drug.stock, reorderLevel: input.drug.reorderLevel, qty: input.qty,
      requestedBy: input.requestedBy, date: new Date().toISOString().slice(0,10),
      priority: input.priority, status:'Submitted', reason: input.reason || input.note || '—',
    };
    setRequests(prev => [local, ...prev]);
    toast.success(`${local.id} created`);
    return true;
  };

  const createPO = async (input: { supplier: Supplier; items: { drug: DrugOption; qty: number; unitCost: number }[]; expected: string; terms: string; notes: string }): Promise<boolean> => {
    if (useApi && input.supplier.apiId != null) {
      try {
        const created = await createPurchaseOrder({
          supplierId: input.supplier.apiId,
          items: input.items.map(i => ({ drugId: i.drug.apiId!, qty: i.qty, unitCost: i.unitCost })),
          expectedDate: input.expected || undefined,
          paymentTerms: input.terms || undefined,
          notes: input.notes || undefined,
        });
        setPOs(prev => [{
          ...mapApiPo(created),
        }, ...prev]);
        toast.success(`${created.poNo} created`);
        return true;
      } catch (e) { toast.error(errMessage(e, 'Could not create purchase order')); return false; }
    }
    await submitDelay();
    const total = input.items.reduce((s, i) => s + i.qty * i.unitCost, 0);
    const local: PurchaseOrder = {
      id: `PO-2026-${String(Math.floor(Math.random()*9000)+1000)}`,
      supplier: input.supplier.name,
      items: input.items.map(i => ({ drugId: i.drug.id, drugName: i.drug.name, qty: i.qty, unitCost: i.unitCost })),
      total, createdBy:'Pharmacist', approval:'Pending', delivery:'Not Sent', status:'Pending Approval',
      expectedDate: input.expected || '—', paymentTerms: input.terms, notes: input.notes,
    };
    setPOs(prev => [local, ...prev]);
    toast.success(`${local.id} created`);
    return true;
  };

  const receive = async (input: { po: PurchaseOrder; item: POItem; batch: string; mfg: string; exp: string; received: number; damaged: number; receivedBy: string; location: string }): Promise<boolean> => {
    if (useApi && input.po.apiId != null) {
      try {
        const created = await receiveStock({
          poId: input.po.apiId,
          drugId: Number(input.item.drugId),
          batchNo: input.batch,
          mfgDate: monthToIso(input.mfg),
          expiryDate: monthToIso(input.exp),
          qtyOrdered: input.item.qty,
          qtyReceived: input.received,
          qtyDamaged: input.damaged,
          unitCost: input.item.unitCost,
          location: input.location || undefined,
        });
        setGRNs(prev => [{
          id: created.grnNo, apiId: created.grnId, poNumber: created.poNo ?? '—',
          supplier: created.supplierName ?? '—', drug: created.drugName, batch: created.batchNo,
          mfgDate: monthOnly(created.mfgDate), expiry: monthOnly(created.expiryDate),
          ordered: created.qtyOrdered, received: created.qtyReceived, damaged: created.qtyDamaged,
          accepted: created.qtyAccepted, receivedBy: created.receivedBy ?? '—',
          location: created.location ?? '—', date: dateOnly(created.receivedAt),
        }, ...prev]);
        toast.success(`Stock received · ${created.grnNo}`, { description:'Inventory & batch records updated.' });
        void loadAll();
        return true;
      } catch (e) { toast.error(errMessage(e, 'Could not receive stock')); return false; }
    }
    await submitDelay();
    const accepted = Math.max(input.received - input.damaged, 0);
    const local: GRN = {
      id: `GRN-2026-${String(Math.floor(Math.random()*9000)+1000)}`,
      poNumber: input.po.id, supplier: input.po.supplier, drug: input.item.drugName,
      batch: input.batch, mfgDate: input.mfg, expiry: input.exp,
      ordered: input.item.qty, received: input.received, damaged: input.damaged, accepted,
      receivedBy: receiverName, location: input.location,
      date: new Date().toISOString().slice(0,10),
    };
    setGRNs(prev => [local, ...prev]);
    setPOs(prev => prev.map(p => {
      if (p.id !== input.po.id) return p;
      const items = p.items.map(i =>
        i.drugId === input.item.drugId
          ? { ...i, qtyReceived: (i.qtyReceived ?? 0) + accepted }
          : i,
      );
      const fully = items.every(i => (i.qtyReceived ?? 0) >= i.qty);
      return {
        ...p,
        items,
        delivery: fully ? 'Delivered' : 'Partial',
        status: fully ? 'Completed' : 'Partially Delivered',
      };
    }));
    setDrugOptions(prev => prev.map(d =>
      d.id === input.item.drugId ? { ...d, stock: d.stock + accepted } : d,
    ));
    toast.success(`Stock received · ${local.id}`, { description:'Inventory & batch records updated.' });
    return true;
  };

  /** Resolve drug names from the catalog for locally-created suppliers (no API). */
  const drugRefsFromIds = (drugIds: number[]): SupplierDrugRef[] =>
    drugIds.map(id => ({
      drugId: id,
      name: drugOptions.find(d => (d.apiId ?? Number(d.id)) === id)?.name ?? `Drug #${id}`,
    }));

  const saveSupplier = async (input: { name: string; contact: string; phone: string; email: string; address: string; drugIds: number[]; performance: number }): Promise<boolean> => {
    if (useApi) {
      try {
        const created = await createSupplier({
          name: input.name, contactPerson: input.contact || undefined,
          phone: input.phone || undefined, email: input.email || undefined,
          address: input.address || undefined, drugIds: input.drugIds,
          performance: input.performance,
        });
        setSuppliers(prev => [{
          id: `SUP-${String(created.supplierId).padStart(3, '0')}`, apiId: created.supplierId,
          name: created.name, contact: created.contactPerson ?? '—', phone: created.phone ?? '—',
          email: created.email ?? '—', address: created.address ?? '—',
          drugIds: created.drugIds, drugs: created.drugs, performance: created.performance,
        }, ...prev]);
        toast.success(`${created.name} added`, { description:'Logged to audit trail.' });
        return true;
      } catch (e) { toast.error(errMessage(e, 'Could not add supplier')); return false; }
    }
    await submitDelay();
    const local: Supplier = {
      id:`SUP-${String(Math.floor(Math.random()*900)+100)}`,
      name: input.name, contact: input.contact, phone: input.phone, email: input.email,
      address: input.address, drugIds: input.drugIds, drugs: drugRefsFromIds(input.drugIds),
      performance: input.performance,
    };
    setSuppliers(prev => [local, ...prev]);
    toast.success(`${local.name} added`);
    return true;
  };

  const saveSupplierEdit = async (original: Supplier, input: { name: string; contact: string; phone: string; email: string; address: string; drugIds: number[]; performance: number }): Promise<boolean> => {
    if (useApi && original.apiId != null) {
      try {
        const updated = await updateSupplier(original.apiId, {
          name: input.name, contactPerson: input.contact, phone: input.phone,
          email: input.email || undefined, address: input.address,
          drugIds: input.drugIds, performance: input.performance,
        });
        setSuppliers(prev => prev.map(s => s.apiId === original.apiId ? {
          ...s, name: updated.name, contact: updated.contactPerson ?? '—',
          phone: updated.phone ?? '—', email: updated.email ?? '—',
          address: updated.address ?? '—', drugIds: updated.drugIds, drugs: updated.drugs,
          performance: updated.performance,
        } : s));
        toast.success(`${updated.name} updated`, { description:'Logged to audit trail.' });
        return true;
      } catch (e) { toast.error(errMessage(e, 'Could not update supplier')); return false; }
    }
    await submitDelay();
    setSuppliers(prev => prev.map(s => s.id === original.id
      ? { ...s, ...input, contact: input.contact, drugs: drugRefsFromIds(input.drugIds) }
      : s));
    toast.success(`${input.name} updated`);
    return true;
  };

  const printPO = (id: string) => toast.success(`Printing ${id}`, { description:'Sent to default printer.' });
  const downloadPO = (id: string) => toast.success(`${id}.pdf downloaded`);
  const exportAll = async () => {
    setExporting(true);
    try {
      await submitDelay();
      toast.success('Procurement export ready', { description:'CSV with requests, POs & GRNs.' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout title="Pharmacy · Procurement" navItems={pharmacyNav as any}>
      {/* Header */}
      <div className="hms-section p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Send className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-display font-bold">Procurement & Purchase Orders</h1>
              <p className="text-sm text-muted-foreground max-w-2xl">Manage drug purchase requests, supplier orders, approvals, deliveries and stock receiving.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPrOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Purchase Request</Button>
            <Button onClick={() => setPoOpen(true)} variant="secondary"><FilePlus className="h-4 w-4 mr-1" /> Create Purchase Order</Button>
            <Button onClick={() => openReceive()} variant="outline"><PackagePlus className="h-4 w-4 mr-1" /> Receive Stock</Button>
            <Button onClick={() => setSupOpen(true)} variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Add Supplier</Button>
            <LoadingButton loading={exporting} loadingText="Exporting…" onClick={() => void exportAll()} variant="outline"><Download className="h-4 w-4 mr-1" /> Export</LoadingButton>
            <Button onClick={() => window.print()} variant="outline"><Printer className="h-4 w-4 mr-1" /> Print</Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="hms-section p-8 mb-5 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading procurement data…
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-5">
        {summary.map(c => (
          <SummaryCard key={c.title} tone={c.tone as any} title={c.title} value={c.value} icon={c.icon} subtitle={c.sub} />
        ))}
      </div>

      {/* Low stock auto-suggestions */}
      {lowStockSuggestions.length > 0 && (
        <div className="hms-section p-4 mb-5 border-l-4 border-l-amber-400 bg-amber-50/40">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <span className="text-sm font-semibold text-amber-900">
                {lowStockSuggestions.length} low / out-of-stock items recommended for procurement
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {lowStockSuggestions.slice(0,4).map(d => (
                <Badge key={d.id} className="border bg-white text-amber-800 border-amber-200">{d.name}</Badge>
              ))}
              <Button size="sm" variant="outline" onClick={() => setPrOpen(true)}>Raise Request</Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="requests">Purchase Requests</TabsTrigger>
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="suppliers">Supplier Management</TabsTrigger>
            <TabsTrigger value="grn">Goods Received Notes</TabsTrigger>
            <TabsTrigger value="approvals">Approval Queue</TabsTrigger>
            <TabsTrigger value="history">Procurement History</TabsTrigger>
          </TabsList>
          <div className="relative w-72 max-w-full">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} className="pl-9 h-9" />
          </div>
        </div>

        {/* Purchase Requests */}
        <TabsContent value="requests">
          <div className="hms-section overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Request ID</TableHead><TableHead>Drug</TableHead><TableHead>Category</TableHead>
                <TableHead className="text-right">Current</TableHead><TableHead className="text-right">Reorder</TableHead><TableHead className="text-right">Qty Req.</TableHead>
                <TableHead>Requested By</TableHead><TableHead>Date</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredRequests.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center py-10 text-muted-foreground"><ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />No purchase requests found.</TableCell></TableRow>
                )}
                {filteredRequests.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell className="font-medium">{r.drugName}</TableCell>
                    <TableCell className="text-xs">{r.category}</TableCell>
                    <TableCell className="text-right">{r.currentStock}</TableCell>
                    <TableCell className="text-right">{r.reorderLevel}</TableCell>
                    <TableCell className="text-right font-semibold">{r.qty}</TableCell>
                    <TableCell className="text-xs">{r.requestedBy}</TableCell>
                    <TableCell className="text-xs">{r.date}</TableCell>
                    <TableCell><Badge className={`border ${priorityTone(r.priority)}`}>{r.priority}</Badge></TableCell>
                    <TableCell><Badge className={`border ${statusTone(r.status)}`}>{r.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setViewPR(r)}><Eye className="h-3 w-3" /></Button>
                        {r.status !== 'Approved' && r.status !== 'Rejected' && (<>
                          <LoadingButton size="sm" loading={isBusy(`apr-pr-${r.id}`)} loadingText="…" onClick={() => void runBusy(`apr-pr-${r.id}`, () => approvePR(r))}><Check className="h-3 w-3" /></LoadingButton>
                          <LoadingButton size="sm" variant="outline" loading={isBusy(`rej-pr-${r.id}`)} loadingText="…" onClick={() => void runBusy(`rej-pr-${r.id}`, () => rejectPR(r))}><X className="h-3 w-3" /></LoadingButton>
                        </>)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Purchase Orders */}
        <TabsContent value="orders">
          <div className="hms-section overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead>Created By</TableHead><TableHead>Approval</TableHead>
                <TableHead>Delivery</TableHead><TableHead>Expected</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredPOs.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground"><FilePlus className="h-8 w-8 mx-auto mb-2 opacity-40" />No purchase orders yet.</TableCell></TableRow>
                )}
                {filteredPOs.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell className="font-medium">{p.supplier}</TableCell>
                    <TableCell className="text-right">{p.items.length}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(p.total)}</TableCell>
                    <TableCell className="text-xs">{p.createdBy}</TableCell>
                    <TableCell><Badge className={`border ${statusTone(p.approval)}`}>{p.approval}</Badge></TableCell>
                    <TableCell><Badge className={`border ${statusTone(p.delivery)}`}>{p.delivery}</Badge></TableCell>
                    <TableCell className="text-xs">{p.expectedDate}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setViewPO(p)} title="View"><Eye className="h-3 w-3" /></Button>
                        {p.approval === 'Pending' && <LoadingButton size="sm" loading={isBusy(`apr-po-${p.id}`)} loadingText="…" onClick={() => void runBusy(`apr-po-${p.id}`, () => approvePO(p))} title="Approve"><Check className="h-3 w-3" /></LoadingButton>}
                        {p.approval === 'Approved' && p.delivery === 'Not Sent' && <LoadingButton size="sm" variant="secondary" loading={isBusy(`send-po-${p.id}`)} loadingText="…" onClick={() => void runBusy(`send-po-${p.id}`, () => sendPO(p))} title="Send to supplier"><Send className="h-3 w-3" /></LoadingButton>}
                        {isReceivablePo(p) && (
                          <Button size="sm" onClick={() => openReceive(p)} title="Accept goods / receive stock">
                            <PackagePlus className="h-3 w-3 mr-1" />Accept
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => printPO(p.id)} title="Print PO"><Printer className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => downloadPO(p.id)} title="Download"><Download className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Suppliers */}
        <TabsContent value="suppliers">
          <div className="hms-section overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Supplier</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead>
                <TableHead>Email</TableHead><TableHead>Drugs Supplied</TableHead><TableHead className="text-right">Performance</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {suppliers.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground"><Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />No suppliers yet. Click "Add Supplier" to create one.</TableCell></TableRow>
                )}
                {suppliers.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> {s.name}</TableCell>
                    <TableCell className="text-xs">{s.contact}</TableCell>
                    <TableCell className="text-xs">{s.phone}</TableCell>
                    <TableCell className="text-xs">{s.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.drugs.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        {s.drugs.slice(0, 4).map(d => <Badge key={d.drugId} variant="outline" className="text-[10px]" title={`Drug ID ${d.drugId}`}>#{d.drugId} {d.name}</Badge>)}
                        {s.drugs.length > 4 && <Badge variant="outline" className="text-[10px]">+{s.drugs.length - 4} more</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={`border ${s.performance>=90 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : s.performance>=85 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>{s.performance}%</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setViewSup(s)}><Eye className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => setEditSup(s)}><Edit className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* GRN */}
        <TabsContent value="grn">
          <div className="hms-section overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>GRN #</TableHead><TableHead>PO</TableHead><TableHead>Supplier</TableHead><TableHead>Drug</TableHead>
                <TableHead>Batch</TableHead><TableHead>Expiry</TableHead><TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead><TableHead className="text-right">Accepted</TableHead>
                <TableHead>Received By</TableHead><TableHead>Date</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {grns.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center py-10 text-muted-foreground"><PackagePlus className="h-8 w-8 mx-auto mb-2 opacity-40" />No goods received yet.</TableCell></TableRow>
                )}
                {grns.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-xs">{g.id}</TableCell>
                    <TableCell className="font-mono text-xs">{g.poNumber}</TableCell>
                    <TableCell className="text-xs">{g.supplier}</TableCell>
                    <TableCell className="font-medium">{g.drug}</TableCell>
                    <TableCell className="text-xs">{g.batch}</TableCell>
                    <TableCell className="text-xs">{g.expiry}</TableCell>
                    <TableCell className="text-right">{g.ordered}</TableCell>
                    <TableCell className="text-right">{g.received}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">{g.accepted}</TableCell>
                    <TableCell className="text-xs">{g.receivedBy}</TableCell>
                    <TableCell className="text-xs">{g.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Approval Queue */}
        <TabsContent value="approvals">
          <div className="hms-section p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Approval Queue</h3>
            <div className="space-y-2">
              {pos.filter(p => p.approval === 'Pending').map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/40">
                  <div>
                    <div className="font-semibold text-sm">{p.id} · {p.supplier}</div>
                    <div className="text-xs text-muted-foreground">{p.items.length} items · {formatCurrency(p.total)} · expected {p.expectedDate}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewPO(p)}>Review</Button>
                    <LoadingButton size="sm" loading={isBusy(`apr-po-q-${p.id}`)} loadingText="Approving…" onClick={() => void runBusy(`apr-po-q-${p.id}`, () => approvePO(p))}><Check className="h-3 w-3 mr-1" />Approve</LoadingButton>
                  </div>
                </div>
              ))}
              {pos.filter(p => p.approval === 'Pending').length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm"><Check className="h-8 w-8 mx-auto mb-2 opacity-40" />Approval queue is clear.</div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(historyCards
                ? [
                    { tone: 'green', title: 'Completed Orders', value: String(historyCards.completedOrders), icon: Check, sub: formatCurrency(historyCards.completedValue) },
                    { tone: 'rose', title: 'Cancelled', value: String(historyCards.cancelledOrders), icon: X, sub: 'Closed without delivery' },
                    { tone: 'amber', title: 'Partial Deliveries', value: String(historyCards.partiallyDelivered), icon: Truck, sub: 'Balance outstanding' },
                    { tone: 'blue', title: 'GRNs Recorded', value: String(historyCards.grnCount), icon: PackagePlus, sub: `${historyCards.totalAcceptedQty} units accepted` },
                    { tone: 'purple', title: 'Received Value', value: formatCurrency(historyCards.receivedValue), icon: TrendingUp, sub: 'Accepted × unit cost' },
                    { tone: 'indigo', title: 'Damaged Qty', value: String(historyCards.totalDamagedQty), icon: AlertTriangle, sub: 'Written off on receipt' },
                  ]
                : [
                    { tone: 'green', title: 'Completed Orders', value: String(pos.filter(p => p.status === 'Completed').length), icon: Check, sub: '—' },
                    { tone: 'rose', title: 'Cancelled', value: String(pos.filter(p => p.status === 'Cancelled').length), icon: X, sub: '—' },
                    { tone: 'amber', title: 'Partial Deliveries', value: String(pos.filter(p => p.delivery === 'Partial').length), icon: Truck, sub: '—' },
                    { tone: 'blue', title: 'GRNs Recorded', value: String(grns.length), icon: PackagePlus, sub: '—' },
                  ]
              ).map(c => (
                <SummaryCard key={c.title} tone={c.tone as 'green'} title={c.title} value={c.value} icon={c.icon} subtitle={c.sub} />
              ))}
            </div>

            <div className="hms-section overflow-x-auto">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Procurement History
                </h3>
                <LoadingButton
                  size="sm"
                  variant="outline"
                  loading={historyLoading}
                  loadingText="Refreshing…"
                  onClick={() => void loadHistory()}
                >
                  Refresh
                </LoadingButton>
              </div>
              {historyLoading && (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading history…</div>
              )}
              {!historyLoading && useApi && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Drugs</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Accepted</TableHead>
                      <TableHead className="text-right">Damaged</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>GRNs</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          No procurement history yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {historyItems.map(h => (
                      <TableRow key={h.poId}>
                        <TableCell className="font-mono text-xs">{h.poNo}</TableCell>
                        <TableCell className="font-medium">{h.supplierName}</TableCell>
                        <TableCell className="text-xs max-w-[220px] truncate" title={h.drugsSummary}>{h.drugsSummary || '—'}</TableCell>
                        <TableCell className="text-right">{h.qtyOrdered}</TableCell>
                        <TableCell className="text-right">{h.qtyReceived}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700">{h.qtyAccepted}</TableCell>
                        <TableCell className="text-right">{h.qtyDamaged}</TableCell>
                        <TableCell className="text-right">{formatCurrency(h.total)}</TableCell>
                        <TableCell className="text-center">{h.grnCount}</TableCell>
                        <TableCell><Badge className={`border ${statusTone(h.status)}`}>{h.status}</Badge></TableCell>
                        <TableCell className="text-xs">{dateOnly(h.updatedAt ?? h.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!historyLoading && !useApi && (
                <div className="p-5 space-y-2 text-sm">
                  {pos.filter(p => p.status === 'Completed' || p.status === 'Cancelled').map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="font-semibold">{p.id} · {p.supplier}</div>
                        <div className="text-xs text-muted-foreground">{p.items.map(i => i.drugName).join(', ')}</div>
                      </div>
                      <Badge className={`border ${statusTone(p.status)}`}>{p.status}</Badge>
                    </div>
                  ))}
                  {pos.filter(p => p.status === 'Completed' || p.status === 'Cancelled').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-40" />No completed or cancelled orders yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ---------- Modals ---------- */}
      <NewPRModal open={prOpen} onOpenChange={setPrOpen} drugs={drugOptions} suggestions={lowStockSuggestions} onCreate={createPR} />
      <NewPOModal  open={poOpen} onOpenChange={setPoOpen} suppliers={suppliers} drugs={drugOptions} onCreate={createPO} />
      <PharmacyReceiveStockModal
        open={recvOpen}
        onOpenChange={(o) => {
          setRecvOpen(o);
          if (!o) setRecvTargetId(null);
        }}
        pos={pos}
        initialPoId={recvTargetId}
        receivedByName={receiverName}
        onReceive={receive}
      />
      <SupplierModal open={supOpen} onOpenChange={setSupOpen} drugs={drugOptions} onSave={saveSupplier} />
      <SupplierModal
        open={!!editSup}
        onOpenChange={(o) => !o && setEditSup(null)}
        drugs={drugOptions}
        initial={editSup ?? undefined}
        onSave={(input) => editSup ? saveSupplierEdit(editSup, input) : saveSupplier(input)}
      />

      {/* View PR */}
      <Dialog open={!!viewPR} onOpenChange={(o) => !o && setViewPR(null)}>
        <DialogContent className={scrollModalClass}>
          <DialogHeader><DialogTitle>{viewPR?.id}</DialogTitle><DialogDescription>Purchase Request details</DialogDescription></DialogHeader>
          {viewPR && (
            <div className="space-y-2 text-sm">
              <Row label="Drug" value={viewPR.drugName} />
              <Row label="Category" value={viewPR.category} />
              <Row label="Current Stock" value={String(viewPR.currentStock)} />
              <Row label="Reorder Level" value={String(viewPR.reorderLevel)} />
              <Row label="Quantity Requested" value={String(viewPR.qty)} />
              <Row label="Priority" value={viewPR.priority} />
              <Row label="Requested By" value={viewPR.requestedBy} />
              <Row label="Date" value={viewPR.date} />
              <Row label="Reason" value={viewPR.reason} />
              <Row label="Status" value={viewPR.status} />
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewPR(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View PO */}
      <Dialog open={!!viewPO} onOpenChange={(o) => !o && setViewPO(null)}>
        <DialogContent className={`max-w-2xl ${scrollModalClass}`}>
          <DialogHeader><DialogTitle>{viewPO?.id}</DialogTitle><DialogDescription>{viewPO?.supplier}</DialogDescription></DialogHeader>
          {viewPO && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Row label="Created By" value={viewPO.createdBy} />
                <Row label="Expected" value={viewPO.expectedDate} />
                <Row label="Approval" value={viewPO.approval} />
                <Row label="Delivery" value={viewPO.delivery} />
                <Row label="Payment Terms" value={viewPO.paymentTerms} />
                <Row label="Status" value={viewPO.status} />
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Drug Name</TableHead><TableHead className="text-right">Packs</TableHead><TableHead className="text-right">Price (₦)</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {viewPO.items.map((i,idx) => (
                    <TableRow key={idx}><TableCell>{i.drugName}</TableCell><TableCell className="text-right">{i.qty}</TableCell><TableCell className="text-right">{formatCurrency(i.unitCost)}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(i.qty * i.unitCost)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right font-bold">Total: {formatCurrency(viewPO.total)}</div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => viewPO && printPO(viewPO.id)}><Printer className="h-4 w-4 mr-1" />Print</Button>
            <Button variant="outline" onClick={() => viewPO && downloadPO(viewPO.id)}><Download className="h-4 w-4 mr-1" />Download PDF</Button>
            <Button onClick={() => setViewPO(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Supplier */}
      <Dialog open={!!viewSup} onOpenChange={(o) => !o && setViewSup(null)}>
        <DialogContent className={scrollModalClass}>
          <DialogHeader><DialogTitle>{viewSup?.name}</DialogTitle><DialogDescription>Supplier profile</DialogDescription></DialogHeader>
          {viewSup && (
            <div className="space-y-2 text-sm">
              <Row label="Contact" value={viewSup.contact} />
              <Row label="Phone" value={viewSup.phone} />
              <Row label="Email" value={viewSup.email} />
              <Row label="Address" value={viewSup.address} />
              <Row label="Drugs Supplied" value={viewSup.drugs.map(d => `#${d.drugId} ${d.name}`).join(', ') || '—'} />
              <Row label="Delivery Performance" value={`${viewSup.performance}%`} />
            </div>
          )}
          <DialogFooter><Button onClick={() => setViewSup(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3 py-1 border-b last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

// ============================================================
// MODALS
// ============================================================
function NewPRModal({ open, onOpenChange, drugs, suggestions, onCreate }: {
  open: boolean; onOpenChange: (o:boolean)=>void; drugs: DrugOption[]; suggestions: DrugOption[];
  onCreate: (input: { drug: DrugOption; qty: number; priority: Priority; reason: string; note: string; requestedBy: string }) => Promise<boolean>;
}) {
  const [drugId, setDrugId] = useState('');
  const [qty, setQty] = useState(100);
  const [priority, setPriority] = useState<Priority>('Normal');
  const [reason, setReason] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const drug = drugs.find(d => d.id === drugId);

  const submit = async () => {
    if (!drug) return toast.error('Pick a drug');
    if (!qty || qty <= 0) return toast.error('Enter a valid quantity');
    setSubmitting(true);
    try {
      const ok = await onCreate({ drug, qty, priority, reason, note, requestedBy });
      if (ok) {
        onOpenChange(false);
        setDrugId(''); setQty(100); setPriority('Normal'); setReason(''); setNote('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-lg ${scrollModalClass}`}>
        <DialogHeader><DialogTitle>New Purchase Request</DialogTitle><DialogDescription>Raise a request for stock replenishment.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Drug</Label>
            <Select value={drugId} onValueChange={setDrugId}>
              <SelectTrigger><SelectValue placeholder="Select drug" /></SelectTrigger>
              <SelectContent>
                {drugs.length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground">No drugs in catalog yet.</div>}
                {suggestions.length > 0 && <div className="px-2 py-1 text-[10px] uppercase text-amber-700">Suggested (low stock)</div>}
                {suggestions.map(d => <SelectItem key={d.id} value={d.id}>{d.name} · {d.status}</SelectItem>)}
                {drugs.length > 0 && <div className="px-2 py-1 text-[10px] uppercase text-muted-foreground">All drugs</div>}
                {drugs.filter(d => !suggestions.find(s => s.id === d.id)).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {drug && (
            <div className="grid grid-cols-3 gap-2 text-xs bg-muted/50 rounded p-2">
              <div><div className="text-muted-foreground">Category</div><div className="font-semibold">{drug.category}</div></div>
              <div><div className="text-muted-foreground">Current Stock</div><div className="font-semibold">{drug.stock}</div></div>
              <div><div className="text-muted-foreground">Reorder Level</div><div className="font-semibold">{drug.reorderLevel}</div></div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantity Requested</Label><Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} /></div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem><SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem><SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Requested By</Label><Input value={requestedBy} onChange={e => setRequestedBy(e.target.value)} placeholder="Defaults to your account" /></div>
          <div><Label>Reason for Request</Label><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Below reorder level" /></div>
          <div><Label>Supporting Note</Label><Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Optional clinical justification" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <LoadingButton loading={submitting} loadingText="Submitting…" onClick={() => void submit()}>Submit Request</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewPOModal({ open, onOpenChange, suppliers, drugs, onCreate }: {
  open: boolean; onOpenChange: (o:boolean)=>void; suppliers: Supplier[]; drugs: DrugOption[];
  onCreate: (input: { supplier: Supplier; items: { drug: DrugOption; qty: number; unitCost: number }[]; expected: string; terms: string; notes: string }) => Promise<boolean>;
}) {
  type Line = { drugId: string; qty: number; unitCost: number };
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<Line[]>([{ drugId:'', qty:1, unitCost:0 }]);
  const [expected, setExpected] = useState('');
  const [terms, setTerms] = useState('30 days net');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const total = items.reduce((s, i) => s + i.qty * i.unitCost, 0);

  const setItem = (idx: number, patch: Partial<Line>) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const submit = async () => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return toast.error('Pick a supplier');
    if (items.length === 0 || items.some(i => !i.drugId)) return toast.error('Complete all line items');
    const mapped = items.map(i => ({ drug: drugs.find(d => d.id === i.drugId)!, qty: i.qty, unitCost: i.unitCost }));
    if (mapped.some(m => !m.drug)) return toast.error('Complete all line items');
    setSubmitting(true);
    try {
      const ok = await onCreate({ supplier, items: mapped, expected, terms, notes });
      if (ok) {
        onOpenChange(false);
        setSupplierId(''); setItems([{ drugId:'', qty:1, unitCost:0 }]); setExpected(''); setNotes('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-3xl ${scrollModalClass}`}>
        <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle><DialogDescription>Issue a PO to a supplier.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground">No suppliers yet — add one first.</div>}
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Expected Delivery</Label><Input type="date" value={expected} onChange={e => setExpected(e.target.value)} /></div>
            <div><Label>Payment Terms</Label><Input value={terms} onChange={e => setTerms(e.target.value)} /></div>
          </div>

          <div>
            <Label>Drug Items</Label>
            <div className="mt-1 rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Drug Name</TableHead>
                    <TableHead className="w-[15%] text-right">Packs</TableHead>
                    <TableHead className="w-[20%] text-right">Price (₦)</TableHead>
                    <TableHead className="w-[20%] text-right">Total</TableHead>
                    <TableHead className="w-[5%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="py-2">
                        <DrugCombobox
                          drugs={drugs}
                          value={it.drugId}
                          onSelect={(d) => setItem(idx, { drugId: d.id, unitCost: d.unitPrice })}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input type="number" min={1} className="h-9 text-right" placeholder="Packs" value={it.qty} onChange={e => setItem(idx, { qty: Number(e.target.value) })} />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input type="number" min={0} className="h-9 text-right" placeholder="Price" value={it.unitCost} onChange={e => setItem(idx, { unitCost: Number(e.target.value) })} />
                      </TableCell>
                      <TableCell className="py-2 text-right text-sm font-semibold">{formatCurrency(it.qty * it.unitCost)}</TableCell>
                      <TableCell className="py-2">
                        <Button size="sm" variant="ghost" aria-label="Remove item" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}><X className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setItems(prev => [...prev, { drugId:'', qty:1, unitCost:0 }])}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
          </div>

          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
          <div className="text-right text-lg font-bold">Total: {formatCurrency(total)}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <LoadingButton loading={submitting} loadingText="Creating…" onClick={() => void submit()}>Create PO</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Numeric drug id for an option — apiId when API-backed, digits of the mock id otherwise. */
const optionDrugId = (d: DrugOption): number =>
  d.apiId ?? (Number(String(d.id).replace(/\D/g, '')) || 0);

/** Single-select searchable drug dropdown (drug names come from the catalog).
 *  modal keeps the popover interactive when rendered inside a Dialog. */
function DrugCombobox({ drugs, value, onSelect, placeholder = 'Search drug…' }: {
  drugs: DrugOption[]; value: string; onSelect: (d: DrugOption) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = drugs.find(d => d.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full h-9 justify-between font-normal">
          <span className="truncate">{selected ? selected.name : 'Select drug'}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No drug found — add it on the Inventory page first.</CommandEmpty>
            <CommandGroup>
              {drugs.map(d => (
                <CommandItem
                  key={d.id}
                  value={`${d.name} ${d.category}`}
                  onSelect={() => { onSelect(d); setOpen(false); }}
                >
                  <Check className={`mr-2 h-3.5 w-3.5 ${d.id === value ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{d.category}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Multi-select drug picker — inline search + checklist (always visible inside
 *  dialogs, no popover/portal issues). Stores DRUG_IDs, shows names. */
function DrugMultiSelect({ drugs, selectedIds, onChange }: {
  drugs: DrugOption[]; selectedIds: number[]; onChange: (ids: number[]) => void;
}) {
  const [search, setSearch] = useState('');
  const toggle = (d: DrugOption) => {
    const id = optionDrugId(d);
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };
  const nameFor = (id: number) => drugs.find(d => optionDrugId(d) === id)?.name ?? `Drug #${id}`;
  const filtered = drugs.filter(d =>
    !search || `${d.name} ${d.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search drug name…"
          className="h-8 pl-8 text-sm"
        />
      </div>
      <div className="rounded-md border max-h-44 overflow-y-auto">
        {drugs.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            No drugs in the catalog yet — create drugs on the Inventory or Drug Catalog page first.
          </div>
        )}
        {drugs.length > 0 && filtered.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">No drug matches "{search}".</div>
        )}
        {filtered.map(d => {
          const id = optionDrugId(d);
          const checked = selectedIds.includes(id);
          return (
            <button
              type="button"
              key={d.id}
              onClick={() => toggle(d)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted/60 ${checked ? 'bg-primary/5' : ''}`}
            >
              <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-primary border-primary text-primary-foreground' : 'border-input'}`}>
                {checked && <Check className="h-3 w-3" />}
              </span>
              <span className="flex-1 truncate">{d.name}</span>
              <span className="text-[10px] text-muted-foreground">ID {id} · {d.category}</span>
            </button>
          );
        })}
      </div>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map(id => (
            <Badge key={id} variant="outline" className="text-[10px] gap-1">
              #{id} {nameFor(id)}
              <button type="button" aria-label={`Remove ${nameFor(id)}`} onClick={() => onChange(selectedIds.filter(x => x !== id))}><X className="h-2.5 w-2.5" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierModal({ open, onOpenChange, drugs, onSave, initial }: {
  open: boolean; onOpenChange: (o:boolean)=>void; drugs: DrugOption[];
  onSave: (input: { name: string; contact: string; phone: string; email: string; address: string; drugIds: number[]; performance: number }) => Promise<boolean>;
  initial?: Supplier;
}) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [drugIds, setDrugIds] = useState<number[]>([]);
  const [performance, setPerformance] = useState(90);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setContact(initial && initial.contact !== '—' ? initial.contact : '');
      setPhone(initial && initial.phone !== '—' ? initial.phone : '');
      setEmail(initial && initial.email !== '—' ? initial.email : '');
      setAddress(initial && initial.address !== '—' ? initial.address : '');
      setDrugIds(initial?.drugIds ?? []);
      setPerformance(initial?.performance ?? 90);
    }
  }, [open, initial]);

  const submit = async () => {
    if (!name.trim()) return toast.error('Name is required');
    setSubmitting(true);
    try {
      const ok = await onSave({ name: name.trim(), contact, phone, email, address, drugIds, performance });
      if (ok) onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={scrollModalClass}>
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${initial.name}` : 'Add Supplier'}</DialogTitle>
          <DialogDescription>{initial ? 'Update the supplier profile.' : 'Create a new supplier profile. Drugs are created separately on the Inventory page.'}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Supplier Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Contact Person</Label><Input value={contact} onChange={e => setContact(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div className="col-span-2"><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="col-span-2"><Label>Address</Label><Input value={address} onChange={e => setAddress(e.target.value)} /></div>
          <div className="col-span-2">
            <Label>Drugs Supplied (from drug catalog)</Label>
            <DrugMultiSelect drugs={drugs} selectedIds={drugIds} onChange={setDrugIds} />
          </div>
          <div><Label>Delivery Performance %</Label><Input type="number" value={performance} onChange={e => setPerformance(Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <LoadingButton loading={submitting} loadingText="Saving…" onClick={() => void submit()}>{initial ? 'Save Changes' : 'Save Supplier'}</LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
