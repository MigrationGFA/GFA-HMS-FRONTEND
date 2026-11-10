import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClinicalPageShell } from '@/components/doctor/ClinicalEmbeddedFrame';
import { setDocPatientContext } from '@/utils/docClinicalPatientContext';
import { ApiError } from '@/lib/api/client';
import {
  listAdmissions,
  listWards,
  type AdmissionRecord,
  type WardRecord,
} from '@/lib/api/admissions';
import {
  createClinicalNote,
  isClinicalNotesApiEnabled,
  listClinicalNotes,
  signClinicalNote,
  submitClinicalNote,
  type ClinicalNoteListItem,
} from '@/lib/api/clinicalNotes';
import { clearDoctorDischargeMockStorage } from '@/lib/api/discharge';
import { ClipboardList, Loader2, RefreshCw, Stethoscope } from 'lucide-react';

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

function admissionName(a: AdmissionRecord): string {
  const p = a.person;
  if (!p) return `Person #${a.personId}`;
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.hospitalNo || `#${a.personId}`;
}

export const DocWardRound = () => {
  const navigate = useNavigate();
  const apiOn = isClinicalNotesApiEnabled();
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [wardId, setWardId] = useState('');
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [notes, setNotes] = useState<ClinicalNoteListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roundStarted, setRoundStarted] = useState(false);
  const [selected, setSelected] = useState<AdmissionRecord | null>(null);
  const [noteText, setNoteText] = useState('');
  const [checklist, setChecklist] = useState({
    vitals: false,
    meds: false,
    plan: false,
    family: false,
  });

  useEffect(() => {
    if (apiOn) clearDoctorDischargeMockStorage();
  }, [apiOn]);

  useEffect(() => {
    if (!apiOn) return;
    listWards({ status: 'Active' })
      .then(setWards)
      .catch(() => setWards([]));
  }, [apiOn]);

  const loadWard = useCallback(async () => {
    if (!apiOn || !wardId) {
      setAdmissions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listAdmissions({
        status: 'ADMITTED,ON_LEAVE,DISCHARGE_ORDERED',
        wardId: Number(wardId),
        limit: 100,
      });
      setAdmissions(data.items ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load ward patients');
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  }, [apiOn, wardId]);

  useEffect(() => {
    void loadWard();
  }, [loadWard]);

  const openBedside = async (a: AdmissionRecord) => {
    setSelected(a);
    setNoteText('');
    setChecklist({ vitals: false, meds: false, plan: false, family: false });
    try {
      const hist = await listClinicalNotes({
        personId: a.personId,
        noteType: 'Ward Round Note',
        limit: 20,
      });
      setNotes(hist.items);
    } catch {
      setNotes([]);
    }
  };

  const saveAndSign = async () => {
    if (!selected) return;
    if (noteText.trim().length < 3) return toast.error('Enter a ward round note');
    setBusy(true);
    try {
      const checklistLine = [
        checklist.vitals ? 'Vitals reviewed' : null,
        checklist.meds ? 'Medications reviewed' : null,
        checklist.plan ? 'Plan updated' : null,
        checklist.family ? 'Family updated' : null,
      ]
        .filter(Boolean)
        .join('; ');
      const created = await createClinicalNote({
        personId: selected.personId,
        noteType: 'Ward Round Note',
        clinic: selected.ward?.name || undefined,
        priority: 'Routine',
        fields: {
          Ward: selected.ward?.name || '',
          'Bed Number': selected.bed?.label || '',
          'Clinical Review': noteText.trim(),
          'Medication Review': checklist.meds ? 'Reviewed' : '',
          Plan: checklist.plan ? 'Updated' : '',
          'Current Vitals': checklist.vitals ? 'Reviewed on round' : '',
          'Overnight Events': checklistLine || '',
        },
      });
      await submitClinicalNote(created.clinicalNoteId);
      await signClinicalNote(created.clinicalNoteId);
      toast.success('Ward round note signed');
      setSelected(null);
      void loadWard();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to save note');
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <div className="space-y-4">
      {!apiOn && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">Backend API is not configured.</div>
      )}
      {error && apiOn && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard title="Patients on ward" value={String(admissions.length)} icon={Stethoscope} />
        <SummaryCard title="Round" value={roundStarted ? 'In progress' : 'Not started'} icon={ClipboardList} />
        <SummaryCard title="Ward" value={wards.find((w) => String(w.wardId) === wardId)?.name ?? '—'} icon={ClipboardList} />
      </div>

      <Card className="space-y-3 max-w-xl">
        <div className="space-y-1.5">
          <Label>Ward</Label>
          <Select
            value={wardId || '__none'}
            onValueChange={(v) => {
              setWardId(v === '__none' ? '' : v);
              setRoundStarted(false);
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Select…</SelectItem>
              {wards.map((w) => (
                <SelectItem key={w.wardId} value={String(w.wardId)}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button disabled={!wardId} onClick={() => setRoundStarted(true)}>Start round</Button>
          <Button variant="outline" disabled={loading} onClick={() => void loadWard()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </Card>

      {wardId && (
        loading ? (
          <Card className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading patients…
          </Card>
        ) : admissions.length === 0 ? (
          <Card className="text-sm text-muted-foreground">No admitted patients on this ward.</Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Bed</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admissions.map((a) => (
                  <tr key={a.admissionId} className="border-t">
                    <td className="p-3">{a.bed?.label ?? '—'}</td>
                    <td className="p-3 font-medium">{admissionName(a)}</td>
                    <td className="p-3">{a.status}</td>
                    <td className="p-3 flex gap-1">
                      <Button size="sm" variant="outline" disabled={!roundStarted} onClick={() => void openBedside(a)}>
                        Bedside
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDocPatientContext({
                            id: String(a.personId),
                            name: admissionName(a),
                            hospitalId: a.person?.hospitalNo || '',
                          });
                          navigate('/dashboard/doctor/clinical/discharge');
                        }}
                      >
                        Discharge
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ward round — {selected ? admissionName(selected) : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {([
                ['vitals', 'Vitals reviewed'],
                ['meds', 'Medications reviewed'],
                ['plan', 'Plan updated'],
                ['family', 'Family updated'],
              ] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 border rounded px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={checklist[k]}
                    onChange={(e) => setChecklist((c) => ({ ...c, [k]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea rows={5} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            </div>
            {notes.length > 0 && (
              <div className="border-t pt-2 space-y-1">
                <p className="text-xs font-medium">Recent ward-round notes</p>
                {notes.slice(0, 5).map((n) => (
                  <p key={n.clinicalNoteId} className="text-xs text-muted-foreground">
                    {n.noteNo} · {n.status} · {n.updatedAt ? new Date(n.updatedAt).toLocaleString() : '—'}
                  </p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            <Button disabled={busy} onClick={() => void saveAndSign()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save &amp; sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <ClinicalPageShell
      shellTitle="Doctor Clinical · Ward Round"
      flowTitle="Ward Round System"
      flowSubtitle="Select a ward, review bedsides, sign Ward Round clinical notes"
    >
      {body}
    </ClinicalPageShell>
  );
};

export default DocWardRound;
