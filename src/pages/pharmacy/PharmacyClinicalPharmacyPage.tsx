import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api/client';
import {
  checkClinicalInteractions,
  closeClinicalPharmacyAlert,
  createPatientAllergy,
  isClinicalPharmacyApiEnabled,
  listClinicalPharmacyAlerts,
  notifyClinicalPharmacyAlert,
  overrideClinicalPharmacyAlert,
  type ClinicalPharmacyAlert,
  type ClinicalPharmacyKpis,
} from '@/lib/api/clinical-pharmacy';
import { searchPersons, type PersonRecord } from '@/lib/api/patients';
import { listDrugs, type ApiDrug } from '@/lib/api/pharmacy';
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
  ShieldAlert,
  Siren,
} from 'lucide-react';
import { pharmacyNav } from '../PharmacyModule';

const emptyKpis: ClinicalPharmacyKpis = {
  open: 0,
  severe: 0,
  allergy: 0,
  overriddenToday: 0,
};

function severityTone(sev: string): string {
  if (sev === 'Severe') return 'bg-rose-100 text-rose-800 border-rose-200';
  if (sev === 'Moderate') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-sky-100 text-sky-800 border-sky-200';
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso.slice(0, 16);
  }
}

export const PharmacyClinicalPharmacyPage = () => {
  const apiOn = isClinicalPharmacyApiEnabled();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ClinicalPharmacyAlert[]>([]);
  const [kpis, setKpis] = useState<ClinicalPharmacyKpis>(emptyKpis);
  const [status, setStatus] = useState('Open');
  const [severity, setSeverity] = useState('all');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');

  const [checkOpen, setCheckOpen] = useState(false);
  const [patientQ, setPatientQ] = useState('');
  const [patientHits, setPatientHits] = useState<PersonRecord[]>([]);
  const [patientBusy, setPatientBusy] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [drugs, setDrugs] = useState<ApiDrug[]>([]);
  const [selectedDrugIds, setSelectedDrugIds] = useState<number[]>([]);
  const [drugQ, setDrugQ] = useState('');
  const [checkBusy, setCheckBusy] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [allergySubstance, setAllergySubstance] = useState('');

  const [overrideAlert, setOverrideAlert] = useState<ClinicalPharmacyAlert | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideBusy, setOverrideBusy] = useState(false);

  const [notifyAlert, setNotifyAlert] = useState<ClinicalPharmacyAlert | null>(null);
  const [notifyNote, setNotifyNote] = useState('');
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setItems([]);
      setKpis(emptyKpis);
      setError('Clinical Pharmacy API is not enabled (set VITE_USE_API and VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listClinicalPharmacyAlerts({
        status: status === 'all' ? undefined : status,
        severity: severity === 'all' ? undefined : severity,
        type: type === 'all' ? undefined : type,
        q: q.trim() || undefined,
        limit: 100,
      });
      setItems(res.items);
      setKpis(res.kpis);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load clinical pharmacy alerts';
      setError(msg);
      setItems([]);
      setKpis(emptyKpis);
    } finally {
      setLoading(false);
    }
  }, [apiOn, status, severity, type, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const searchPatients = async () => {
    const term = patientQ.trim();
    if (term.length < 2) {
      toast.error('Enter at least 2 characters to search patients');
      return;
    }
    setPatientBusy(true);
    try {
      const hits = await searchPersons(term);
      setPatientHits(hits);
      if (!hits.length) toast.info('No patients found');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Patient search failed');
    } finally {
      setPatientBusy(false);
    }
  };

  const loadDrugs = async (term: string) => {
    try {
      const res = await listDrugs({ q: term || undefined, limit: 40 });
      setDrugs(res.items);
    } catch {
      setDrugs([]);
    }
  };

  useEffect(() => {
    if (!checkOpen) return;
    void loadDrugs('');
  }, [checkOpen]);

  const runCheck = async () => {
    if (!selectedPerson) {
      toast.error('Select a patient first');
      return;
    }
    setCheckBusy(true);
    setCheckResult(null);
    try {
      if (allergySubstance.trim().length >= 2) {
        await createPatientAllergy({
          personId: selectedPerson.personId,
          substance: allergySubstance.trim(),
          severity: 'Severe',
        });
      }
      const res = await checkClinicalInteractions({
        personId: selectedPerson.personId,
        drugIds: selectedDrugIds.length ? selectedDrugIds : undefined,
      });
      setCheckResult(
        res.findings.length
          ? `${res.findings.length} alert(s) from ${res.medCount} med(s) / ${res.allergyCount} allerg(ies)`
          : `No alerts — checked ${res.medCount} med(s) against ${res.ruleCount} rule(s)`,
      );
      toast.success(
        res.findings.length
          ? `${res.findings.length} clinical alert(s) recorded`
          : 'No interactions detected',
      );
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Interaction check failed');
    } finally {
      setCheckBusy(false);
    }
  };

  const submitOverride = async () => {
    if (!overrideAlert) return;
    const reason = overrideReason.trim();
    if (reason.length < 5) {
      toast.error('Override reason must be at least 5 characters');
      return;
    }
    setOverrideBusy(true);
    try {
      await overrideClinicalPharmacyAlert(overrideAlert.alertId, reason);
      toast.success(`${overrideAlert.alertNo} overridden`);
      setOverrideAlert(null);
      setOverrideReason('');
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Override failed');
    } finally {
      setOverrideBusy(false);
    }
  };

  const submitNotify = async () => {
    if (!notifyAlert) return;
    setNotifyBusy(true);
    try {
      await notifyClinicalPharmacyAlert(notifyAlert.alertId, notifyNote.trim() || undefined);
      toast.success(`Doctor notified for ${notifyAlert.alertNo}`);
      setNotifyAlert(null);
      setNotifyNote('');
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Notify failed');
    } finally {
      setNotifyBusy(false);
    }
  };

  const onClose = async (row: ClinicalPharmacyAlert) => {
    setActionId(row.alertId);
    try {
      await closeClinicalPharmacyAlert(row.alertId);
      toast.success(`${row.alertNo} closed`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Close failed');
    } finally {
      setActionId(null);
    }
  };

  const toggleDrug = (id: number) => {
    setSelectedDrugIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <DashboardLayout title="Clinical Pharmacy" navItems={pharmacyNav as any}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Interaction &amp; Safety
          </h2>
          <p className="text-sm text-muted-foreground">
            Drug–drug, allergy, duplicate therapy, controlled and psychiatric warnings.
          </p>
        </div>
        <Button onClick={() => setCheckOpen(true)}>Check Interactions</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Open Alerts" value={loading ? '…' : String(kpis.open)} icon={ShieldAlert} />
        <SummaryCard title="Severe" value={loading ? '…' : String(kpis.severe)} icon={Siren} />
        <SummaryCard title="Allergy" value={loading ? '…' : String(kpis.allergy)} icon={AlertTriangle} />
        <SummaryCard
          title="Overridden Today"
          value={loading ? '…' : String(kpis.overriddenToday)}
          icon={CheckCircle}
        />
      </div>

      <div className="bg-card rounded-xl border p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1 min-w-[140px]">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Overridden">Overridden</SelectItem>
              <SelectItem value="Notified">Notified</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-[140px]">
          <Label>Severity</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Severe">Severe</SelectItem>
              <SelectItem value="Moderate">Moderate</SelectItem>
              <SelectItem value="Mild">Mild</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-[160px]">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="DDI">DDI</SelectItem>
              <SelectItem value="Allergy">Allergy</SelectItem>
              <SelectItem value="Duplicate">Duplicate</SelectItem>
              <SelectItem value="Controlled">Controlled</SelectItem>
              <SelectItem value="Psychiatric">Psychiatric</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[180px]">
          <Label>Search</Label>
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Alert no, drug, message…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void load();
              }}
            />
            <Button variant="outline" onClick={() => void load()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading alerts…
        </div>
      )}

      {!loading && error && (
        <div className="bg-card rounded-xl border p-6 text-center space-y-3">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bg-card rounded-xl border p-8 text-center text-sm text-muted-foreground">
          No clinical pharmacy alerts in this view. Use <strong>Check Interactions</strong> to scan a
          patient.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="bg-card rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Drugs</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Rx</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => {
                const busy = actionId === row.alertId;
                return (
                  <TableRow key={row.alertId}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {row.alertNo}
                      <div className="mt-1">
                        <Badge variant="outline" className={severityTone(row.severity)}>
                          {row.severity}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{row.patientName}</div>
                      <div className="text-xs text-muted-foreground">{row.hospitalNo ?? '—'}</div>
                    </TableCell>
                    <TableCell>{row.alertType}</TableCell>
                    <TableCell className="text-sm">
                      {row.drugA}
                      {row.drugB ? ` ⟷ ${row.drugB}` : ''}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {row.message}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.rxNo ?? '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatWhen(row.createdAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      {row.status === 'Open' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                              setOverrideAlert(row);
                              setOverrideReason('');
                            }}
                          >
                            Override
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy || !row.doctorUserId}
                            title={
                              !row.doctorUserId
                                ? 'No prescribing doctor linked'
                                : 'Notify prescribing doctor'
                            }
                            onClick={() => {
                              setNotifyAlert(row);
                              setNotifyNote('');
                            }}
                          >
                            Notify
                          </Button>
                        </>
                      )}
                      {row.status !== 'Closed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void onClose(row)}
                        >
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Close'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Check Interactions */}
      <Dialog
        open={checkOpen}
        onOpenChange={(v) => {
          if (checkBusy) return;
          setCheckOpen(v);
          if (!v) {
            setCheckResult(null);
            setSelectedPerson(null);
            setPatientHits([]);
            setSelectedDrugIds([]);
            setAllergySubstance('');
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Check Interactions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <div className="flex gap-2">
                <Input
                  value={patientQ}
                  onChange={(e) => setPatientQ(e.target.value)}
                  placeholder="Name or hospital no…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void searchPatients();
                  }}
                />
                <Button variant="outline" disabled={patientBusy} onClick={() => void searchPatients()}>
                  {patientBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {selectedPerson && (
                <p className="text-sm text-emerald-700">
                  Selected:{' '}
                  {[selectedPerson.firstName, selectedPerson.lastName].filter(Boolean).join(' ')} (
                  {selectedPerson.hospitalNo ?? `#${selectedPerson.personId}`})
                </p>
              )}
              {patientHits.length > 0 && (
                <div className="border rounded-md max-h-36 overflow-y-auto divide-y">
                  {patientHits.map((p) => (
                    <button
                      key={p.personId}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => {
                        setSelectedPerson(p);
                        setPatientHits([]);
                      }}
                    >
                      {[p.firstName, p.lastName].filter(Boolean).join(' ')} — {p.hospitalNo ?? p.personId}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Optional allergy to record (e.g. Penicillin)</Label>
              <Input
                value={allergySubstance}
                onChange={(e) => setAllergySubstance(e.target.value)}
                placeholder="Leave blank to skip"
              />
            </div>

            <div className="space-y-2">
              <Label>Optional proposed drugs (in addition to active Rx)</Label>
              <Input
                value={drugQ}
                onChange={(e) => {
                  setDrugQ(e.target.value);
                  void loadDrugs(e.target.value);
                }}
                placeholder="Filter catalog…"
              />
              <div className="border rounded-md max-h-40 overflow-y-auto divide-y">
                {drugs.slice(0, 25).map((d) => {
                  const on = selectedDrugIds.includes(d.drugId);
                  return (
                    <button
                      key={d.drugId}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm ${on ? 'bg-primary/10' : 'hover:bg-muted'}`}
                      onClick={() => toggleDrug(d.drugId)}
                    >
                      {on ? '✓ ' : ''}
                      {d.name}
                      {d.strength ? ` ${d.strength}` : ''}
                    </button>
                  );
                })}
                {!drugs.length && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No drugs loaded</p>
                )}
              </div>
            </div>

            {checkResult && <p className="text-sm text-muted-foreground">{checkResult}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={checkBusy} onClick={() => setCheckOpen(false)}>
              Cancel
            </Button>
            <Button disabled={checkBusy || !selectedPerson} onClick={() => void runCheck()}>
              {checkBusy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking…
                </>
              ) : (
                'Run check'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override */}
      <Dialog
        open={!!overrideAlert}
        onOpenChange={(v) => {
          if (overrideBusy) return;
          if (!v) {
            setOverrideAlert(null);
            setOverrideReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override {overrideAlert?.alertNo}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {overrideAlert?.drugA}
            {overrideAlert?.drugB ? ` ⟷ ${overrideAlert.drugB}` : ''} — {overrideAlert?.message}
          </p>
          <div className="space-y-2">
            <Label>Reason (required)</Label>
            <Textarea
              rows={4}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Clinical justification for override…"
              disabled={overrideBusy}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={overrideBusy}
              onClick={() => setOverrideAlert(null)}
            >
              Cancel
            </Button>
            <Button disabled={overrideBusy} onClick={() => void submitOverride()}>
              {overrideBusy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                'Confirm override'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify */}
      <Dialog
        open={!!notifyAlert}
        onOpenChange={(v) => {
          if (notifyBusy) return;
          if (!v) {
            setNotifyAlert(null);
            setNotifyNote('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notify doctor — {notifyAlert?.alertNo}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sends an in-app notification to the prescribing doctor linked to this alert.
          </p>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              rows={3}
              value={notifyNote}
              onChange={(e) => setNotifyNote(e.target.value)}
              placeholder="Additional context for the doctor…"
              disabled={notifyBusy}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={notifyBusy} onClick={() => setNotifyAlert(null)}>
              Cancel
            </Button>
            <Button disabled={notifyBusy} onClick={() => void submitNotify()}>
              {notifyBusy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                </>
              ) : (
                'Send notification'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

/** Route alias used by App.tsx */
export const PharmacyInteractionCenter = PharmacyClinicalPharmacyPage;
