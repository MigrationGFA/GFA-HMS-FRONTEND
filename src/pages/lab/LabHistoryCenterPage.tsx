import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  History, ChevronLeft, Download, FileText, Loader2, RefreshCw, AlertTriangle, Search, Activity,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { searchPersons, isPatientsApiEnabled } from '@/lib/api/patients';
import {
  isLaboratoryApiEnabled,
  getLabHistory,
  type ApiLabHistory,
  type ApiLabHistoryItem,
} from '@/lib/api/laboratory';
import { LabShell, LabCard, LabSection, labTone, labStatusLabel } from './LabPageShell';

type PickedPatient = {
  personId: number;
  name: string;
  hospitalNo: string;
  sex: string;
};

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPdf(filename: string, lines: string[]) {
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text('Patient Laboratory History', 14, 16);
  doc.setFontSize(9);
  let y = 26;
  for (const line of lines) {
    doc.text(line.slice(0, 100), 14, y);
    y += 5;
    if (y > 280) {
      doc.addPage();
      y = 16;
    }
  }
  doc.save(filename);
}

export const LabHistoryCenter = () => {
  const apiOn = isLaboratoryApiEnabled();
  const patientsOn = isPatientsApiEnabled();

  const [patientQ, setPatientQ] = useState('');
  const [hits, setHits] = useState<PickedPatient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [patient, setPatient] = useState<PickedPatient | null>(null);

  const [history, setHistory] = useState<ApiLabHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!patientsOn) return;
    const term = patientQ.trim();
    if (term.length < 2) {
      setHits([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      searchPersons(term)
        .then((rows) => {
          if (cancelled) return;
          setHits(
            rows.map((r) => ({
              personId: r.personId,
              name: [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') || 'Unknown',
              hospitalNo: r.hospitalNo || `PID-${r.personId}`,
              sex: r.sex ?? '—',
            })),
          );
        })
        .catch((err) => {
          if (cancelled) return;
          const msg = err instanceof ApiError ? err.message : 'Patient search failed';
          setSearchError(msg);
          setHits([]);
          toast.error(msg);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [patientQ, patientsOn]);

  const loadHistory = async (p: PickedPatient, filterQ?: string) => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getLabHistory({
        personId: p.personId,
        q: filterQ?.trim() || undefined,
        limit: 100,
      });
      setHistory(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load lab history');
      setHistory(null);
    } finally {
      setLoading(false);
    }
  };

  const selectPatient = (p: PickedPatient) => {
    setPatient(p);
    setPatientQ('');
    setHits([]);
    void loadHistory(p);
  };

  const exportCsv = (items: ApiLabHistoryItem[]) => {
    downloadCsv(`lab-history-${patient?.hospitalNo || 'patient'}.csv`, [
      ['Date', 'Request', 'Test', 'Category', 'Payment', 'Lab Status', 'Result', 'Validated'],
      ...items.map((r) => [
        r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '',
        r.requestNo,
        r.testName,
        r.category || '',
        r.paymentStatus,
        r.labStatus,
        r.resultSummary || r.resultStatus || '',
        r.validatedAt ? new Date(r.validatedAt).toLocaleString() : '',
      ]),
    ]);
  };

  const exportPdf = (items: ApiLabHistoryItem[]) => {
    downloadPdf(`lab-history-${patient?.hospitalNo || 'patient'}.pdf`, [
      `Patient: ${patient?.name} (${patient?.hospitalNo})`,
      '',
      ...items.map(
        (r) =>
          `${r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : '—'} · ${r.requestNo} · ${r.testName} · ${r.resultSummary || r.labStatus}`,
      ),
    ]);
  };

  if (patient) {
    const items = history?.items ?? [];
    return (
      <LabShell title="Patient Laboratory History">
        <LabSection
          icon={<History className="h-5 w-5" />}
          title={`${patient.name} · ${patient.hospitalNo}`}
          desc="Live longitudinal lab requests and results from the LIS."
          action={
            <Button variant="outline" onClick={() => { setPatient(null); setHistory(null); setError(null); }}>
              <ChevronLeft className="h-4 w-4 mr-1" />Back to search
            </Button>
          }
        />

        {error && (
          <LabCard className="mb-4 border-rose-200 bg-rose-50">
            <p className="text-sm text-rose-900 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</p>
          </LabCard>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <SummaryCard title="History rows" value={String(history?.meta.total ?? items.length)} icon={Activity} />
          <SummaryCard title="Validated" value={String(items.filter((i) => i.validatedAt).length)} icon={History} />
          <SummaryCard title="Sex" value={patient.sex} icon={Search} />
        </div>

        <LabCard>
          <div className="flex flex-wrap gap-2 mb-3 justify-between">
            <div className="flex gap-2 flex-wrap">
              <Input
                className="max-w-xs"
                placeholder="Filter tests / request no…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadHistory(patient, q);
                }}
              />
              <Button size="sm" variant="outline" onClick={() => void loadHistory(patient, q)} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={!items.length} onClick={() => exportCsv(items)}>
                <Download className="h-3 w-3 mr-1" />CSV
              </Button>
              <Button size="sm" variant="outline" disabled={!items.length} onClick={() => exportPdf(items)}>
                <FileText className="h-3 w-3 mr-1" />PDF
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No lab history for this patient.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Lab status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={`${r.requestId}-${r.testCode}-${r.resultId ?? 0}`}>
                    <TableCell className="text-xs">
                      {r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{r.testName}</div>
                      <div className="text-xs text-muted-foreground">{r.category || r.testCode}</div>
                    </TableCell>
                    <TableCell className="text-sm max-w-[280px]">
                      {r.resultSummary || r.resultStatus || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={labTone(r.paymentStatus === 'Paid' || r.paymentStatus === 'Waived' ? 'green' : 'amber')}>
                        {r.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{labStatusLabel(r.labStatus)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </LabCard>
      </LabShell>
    );
  }

  return (
    <LabShell title="Patient Laboratory History">
      <LabSection
        icon={<History className="h-5 w-5" />}
        title="Patient History Center"
        desc="Search a registered patient to load live lab request and result history."
      />

      {!apiOn && (
        <LabCard className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">Backend API is not configured.</p>
        </LabCard>
      )}
      {apiOn && !patientsOn && (
        <LabCard className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">Patients API is off — search will not work.</p>
        </LabCard>
      )}

      <LabCard>
        <LabelRow />
        <Input
          placeholder="Search by name, hospital no, or phone…"
          value={patientQ}
          onChange={(e) => setPatientQ(e.target.value)}
          className="mb-3 max-w-lg"
        />
        {searching && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Searching…
          </div>
        )}
        {searchError && <p className="text-sm text-rose-700 mb-2">{searchError}</p>}
        <div className="border rounded-lg divide-y max-h-[420px] overflow-y-auto">
          {hits.map((p) => (
            <button
              key={p.personId}
              type="button"
              className="w-full text-left p-3 hover:bg-muted/40"
              onClick={() => selectPatient(p)}
            >
              <div className="font-medium text-sm">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.hospitalNo} · {p.sex}</div>
            </button>
          ))}
          {!searching && patientQ.trim().length >= 2 && hits.length === 0 && !searchError && (
            <div className="text-sm text-muted-foreground py-8 text-center">No patient found.</div>
          )}
          {patientQ.trim().length < 2 && (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Type at least 2 characters to search.
            </div>
          )}
        </div>
      </LabCard>
    </LabShell>
  );
};

const LabelRow = () => (
  <div className="text-xs font-medium text-muted-foreground mb-1">Find patient</div>
);

export default LabHistoryCenter;
