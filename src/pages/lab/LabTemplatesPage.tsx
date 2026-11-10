import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen, Plus, Pencil, Copy, Loader2, RefreshCw, AlertTriangle, Trash2, Search,
  ArrowUp, ArrowDown, Layers, CheckCircle2, XCircle, Eye,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  isLaboratoryApiEnabled,
  listLabTemplates,
  getLabTemplate,
  createLabTemplate,
  updateLabTemplate,
  type ApiLabTemplate,
  type ApiTemplateField,
  type ApiTemplateFieldType,
} from '@/lib/api/laboratory';
import { LabShell, LabCard, LabSection, labTone } from './LabPageShell';

const CATEGORIES = [
  'Serology', 'Haematology', 'Microbiology', 'Chemistry', 'Toxicology',
  'Andrology', 'Histopathology', 'Other',
];

const FIELD_TYPES: { value: ApiTemplateFieldType; label: string }[] = [
  { value: 'select', label: 'Dropdown (select)' },
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'multiselect', label: 'Multi-select' },
];

type DraftField = ApiTemplateField & { _optionsText?: string; _criticalText?: string };

type EditorState = {
  templateId: number | null; // null = create
  name: string;
  category: string;
  description: string;
  fields: DraftField[];
};

const emptyField = (): DraftField => ({
  key: '',
  label: '',
  type: 'select',
  _optionsText: '',
  _criticalText: '',
});

const toDraftField = (f: ApiTemplateField): DraftField => ({
  ...f,
  _optionsText: (f.options ?? []).join(', '),
  _criticalText: (f.critical ?? []).join(', '),
});

const keyFromLabel = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '').slice(0, 40);

function draftToApiFields(fields: DraftField[]): ApiTemplateField[] {
  return fields.map((f) => {
    const options = (f._optionsText ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const critical = (f._criticalText ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const out: ApiTemplateField = {
      key: f.key.trim() || keyFromLabel(f.label),
      label: f.label.trim(),
      type: f.type,
    };
    if (options.length) out.options = options;
    if (critical.length) out.critical = critical;
    if (f.unit?.trim()) out.unit = f.unit.trim();
    if (f.ref?.trim()) out.ref = f.ref.trim();
    if (f.required) out.required = true;
    return out;
  });
}

export const LabTemplatesPage = () => {
  const apiOn = isLaboratoryApiEnabled();
  const [items, setItems] = useState<ApiLabTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const [tab, setTab] = useState<'active' | 'inactive' | 'all'>('active');

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<ApiLabTemplate | null>(null);
  const [viewing, setViewing] = useState<ApiLabTemplate | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = async (t: ApiLabTemplate) => {
    setViewing(t);
    setPreviewLoading(true);
    try {
      const detail = await getLabTemplate(t.templateId);
      setViewing(detail);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load template preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const load = async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listLabTemplates({ q: q.trim() || undefined, limit: 200 });
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load result templates');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOn]);

  const filtered = useMemo(
    () =>
      items.filter((t) => {
        if (tab === 'active' && t.status !== 'Active') return false;
        if (tab === 'inactive' && t.status !== 'Inactive') return false;
        if (category !== 'All' && t.category !== category) return false;
        return true;
      }),
    [items, tab, category],
  );

  const counts = useMemo(
    () => ({
      total: items.length,
      active: items.filter((t) => t.status === 'Active').length,
      inactive: items.filter((t) => t.status === 'Inactive').length,
      categories: new Set(items.map((t) => t.category)).size,
    }),
    [items],
  );

  const openCreate = () =>
    setEditor({ templateId: null, name: '', category: 'Other', description: '', fields: [emptyField()] });

  const openEdit = (t: ApiLabTemplate) =>
    setEditor({
      templateId: t.templateId,
      name: t.name,
      category: t.category,
      description: t.description ?? '',
      fields: (t.fields ?? []).map(toDraftField),
    });

  const duplicate = async (t: ApiLabTemplate) => {
    try {
      const copy = await createLabTemplate({
        name: `${t.name} (Copy)`,
        category: t.category,
        description: t.description ?? undefined,
        fields: t.fields ?? [],
      });
      toast.success(`Template duplicated as "${copy.name}"`);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not duplicate template');
    }
  };

  const toggleStatus = async (t: ApiLabTemplate) => {
    const next = t.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateLabTemplate(t.templateId, { status: next });
      toast.success(`Template ${next === 'Active' ? 'reactivated' : 'deactivated'}: ${t.name}`);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update template');
    } finally {
      setToggling(null);
    }
  };

  const saveEditor = async () => {
    if (!editor) return;
    if (!editor.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    const fields = editor.fields.filter((f) => f.label.trim());
    if (fields.length === 0) {
      toast.error('Add at least one field');
      return;
    }
    const apiFields = draftToApiFields(fields);
    const keys = apiFields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      toast.error('Field keys must be unique');
      return;
    }
    setSaving(true);
    try {
      if (editor.templateId == null) {
        await createLabTemplate({
          name: editor.name.trim(),
          category: editor.category,
          description: editor.description.trim() || undefined,
          fields: apiFields,
        });
        toast.success('Template created');
      } else {
        await updateLabTemplate(editor.templateId, {
          name: editor.name.trim(),
          category: editor.category,
          description: editor.description.trim() || undefined,
          fields: apiFields,
        });
        toast.success('Template updated');
      }
      setEditor(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save template');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (idx: number, patch: Partial<DraftField>) => {
    if (!editor) return;
    setEditor({
      ...editor,
      fields: editor.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    });
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    if (!editor) return;
    const next = [...editor.fields];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setEditor({ ...editor, fields: next });
  };

  const removeField = (idx: number) => {
    if (!editor) return;
    setEditor({ ...editor, fields: editor.fields.filter((_, i) => i !== idx) });
  };

  return (
    <LabShell title="Result Templates">
      <LabSection
        icon={<BookOpen className="h-5 w-5" />}
        title="Result Templates"
        desc="Database-managed result-entry schemas. Deactivated templates stay stored for past results (soft delete)."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New Template
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Templates" value={String(counts.total)} icon={BookOpen} />
        <SummaryCard title="Active" value={String(counts.active)} icon={CheckCircle2} />
        <SummaryCard title="Inactive" value={String(counts.inactive)} icon={XCircle} />
        <SummaryCard title="Categories" value={String(counts.categories)} icon={Layers} />
      </div>

      <LabCard className="mb-4">
        <div className="flex gap-2 flex-wrap">
          <Input
            className="max-w-md"
            placeholder="Search template name / code / category…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load();
            }}
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void load()}>
            <Search className="h-4 w-4 mr-1" /> Search
          </Button>
        </div>
      </LabCard>

      <LabCard>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({counts.inactive})</TabsTrigger>
            <TabsTrigger value="all">All ({counts.total})</TabsTrigger>
          </TabsList>
          <div className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
              </div>
            ) : error ? (
              <div className="py-12 text-center text-sm text-rose-600 flex flex-col items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                {error}
                <Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Fields</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        No templates in this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((t) => (
                      <TableRow key={t.templateId}>
                        <TableCell className="font-mono text-xs">{t.code}</TableCell>
                        <TableCell>
                          <button className="font-medium text-sm text-left hover:underline" onClick={() => void openPreview(t)}>
                            {t.name}
                          </button>
                          {t.description && (
                            <div className="text-xs text-muted-foreground max-w-[280px] truncate">{t.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={labTone('blue')}>{t.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{(t.fields ?? []).length}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={labTone(t.status === 'Active' ? 'green' : 'rose')}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.updatedAt
                            ? new Date(t.updatedAt).toLocaleDateString()
                            : t.createdAt
                              ? new Date(t.createdAt).toLocaleDateString()
                              : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => void openPreview(t)}>
                              <Eye className="h-3 w-3 mr-1" /> Preview
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void duplicate(t)}>
                              <Copy className="h-3 w-3 mr-1" /> Duplicate
                            </Button>
                            <Button
                              size="sm"
                              variant={t.status === 'Active' ? 'destructive' : 'outline'}
                              onClick={() => setToggling(t)}
                            >
                              {t.status === 'Active'
                                ? (<><Trash2 className="h-3 w-3 mr-1" /> Deactivate</>)
                                : (<><CheckCircle2 className="h-3 w-3 mr-1" /> Reactivate</>)}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </Tabs>
      </LabCard>

      {/* Sample Result Layout preview — fields from GET /templates/:id only */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>Sample Result Layout · {viewing.name}</DialogTitle>
                <DialogDescription>
                  {viewing.code} · {viewing.category}
                  {viewing.description ? ` · ${viewing.description}` : ''}
                  {' · '}Preview from backend field schema (read-only).
                </DialogDescription>
              </DialogHeader>
              {previewLoading ? (
                <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading schema…
                </div>
              ) : (viewing.fields ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">This template has no fields.</p>
              ) : (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
                    Result entry form preview
                  </div>
                  {(viewing.fields ?? []).map((f) => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-sm">
                        {f.label}
                        {f.required ? <span className="text-rose-600"> *</span> : null}
                        {f.unit ? <span className="text-muted-foreground font-normal"> ({f.unit})</span> : null}
                      </Label>
                      {f.type === 'select' || f.type === 'multiselect' ? (
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue placeholder={f.options?.length ? f.options.join(' / ') : 'Select…'} />
                          </SelectTrigger>
                          <SelectContent>
                            {(f.options ?? []).map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : f.type === 'textarea' ? (
                        <Textarea disabled rows={2} placeholder="—" />
                      ) : (
                        <Input disabled type={f.type === 'number' ? 'number' : 'text'} placeholder="—" />
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span className="font-mono">{f.key}</span>
                        <span>{f.type}</span>
                        {f.ref ? <span>Ref: {f.ref}</span> : null}
                        {f.critical?.length ? (
                          <span className="text-rose-600">Critical: {f.critical.join(', ')}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => { const t = viewing; setViewing(null); openEdit(t); }}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit dialog with field builder */}
      <Dialog open={!!editor} onOpenChange={(o) => !o && !saving && setEditor(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {editor && (
            <>
              <DialogHeader>
                <DialogTitle>{editor.templateId == null ? 'New Result Template' : 'Edit Result Template'}</DialogTitle>
                <DialogDescription>
                  Define the fields the bench scientist fills during result entry. Use dropdowns to prevent free-typing errors.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editor.name}
                    onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                    placeholder="e.g. Full Blood Count (FBC)"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={editor.category} onValueChange={(v) => setEditor({ ...editor, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    rows={2}
                    value={editor.description}
                    onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Fields ({editor.fields.length})</h3>
                  <Button size="sm" variant="outline" onClick={() => setEditor({ ...editor, fields: [...editor.fields, emptyField()] })}>
                    <Plus className="h-3 w-3 mr-1" /> Add Field
                  </Button>
                </div>
                {editor.fields.map((f, idx) => (
                  <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Field {idx + 1}</span>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveField(idx, -1)} disabled={idx === 0}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveField(idx, 1)} disabled={idx === editor.fields.length - 1}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-600" onClick={() => removeField(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={f.label}
                          onChange={(e) => {
                            const label = e.target.value;
                            updateField(idx, {
                              label,
                              key: f.key && f.key !== keyFromLabel(f.label) ? f.key : keyFromLabel(label),
                            });
                          }}
                          placeholder="e.g. Haemoglobin"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Key</Label>
                        <Input
                          value={f.key}
                          onChange={(e) => updateField(idx, { key: e.target.value })}
                          placeholder="hb"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select value={f.type} onValueChange={(v) => updateField(idx, { type: v as ApiTemplateFieldType })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((ft) => <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(f.type === 'select' || f.type === 'multiselect') && (
                      <div>
                        <Label className="text-xs">Options (comma-separated)</Label>
                        <Input
                          value={f._optionsText ?? ''}
                          onChange={(e) => updateField(idx, { _optionsText: e.target.value })}
                          placeholder="Positive, Negative"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Unit (optional)</Label>
                        <Input value={f.unit ?? ''} onChange={(e) => updateField(idx, { unit: e.target.value })} placeholder="g/dL" />
                      </div>
                      <div>
                        <Label className="text-xs">Reference range (optional)</Label>
                        <Input value={f.ref ?? ''} onChange={(e) => updateField(idx, { ref: e.target.value })} placeholder="M:13–17 / F:12–15" />
                      </div>
                      <div>
                        <Label className="text-xs">Critical values (comma-separated)</Label>
                        <Input
                          value={f._criticalText ?? ''}
                          onChange={(e) => updateField(idx, { _criticalText: e.target.value })}
                          placeholder="Positive"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`req-${idx}`}
                        checked={!!f.required}
                        onCheckedChange={(v) => updateField(idx, { required: v === true })}
                      />
                      <Label htmlFor={`req-${idx}`} className="text-xs">Required field</Label>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditor(null)} disabled={saving}>Cancel</Button>
                <Button onClick={() => void saveEditor()} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {editor.templateId == null ? 'Create Template' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate / Reactivate confirm */}
      <AlertDialog open={!!toggling} onOpenChange={(o) => !o && setToggling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggling?.status === 'Active' ? 'Deactivate template?' : 'Reactivate template?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggling?.status === 'Active'
                ? `"${toggling?.name}" will no longer appear in result entry. Existing results that used it are kept (soft delete — nothing is removed from the database).`
                : `"${toggling?.name}" will become available again in result entry.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toggling && void toggleStatus(toggling)}>
              {toggling?.status === 'Active' ? 'Deactivate' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LabShell>
  );
};

export default LabTemplatesPage;
