import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClinicalPageShell } from '@/components/doctor/ClinicalEmbeddedFrame';
import { setDocPatientContext } from '@/utils/docClinicalPatientContext';
import { ApiError } from '@/lib/api/client';
import {
  getPerson,
  isPatientsApiEnabled,
  searchPersons,
  type PersonRecord,
} from '@/lib/api/patients';
import { clearDoctorDischargeMockStorage } from '@/lib/api/discharge';
import { Loader2, RefreshCw, Search, Users, Eye } from 'lucide-react';

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

function personName(p: PersonRecord): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || p.hospitalNo || `#${p.personId}`;
}

export const DoctorPatientDirectory = () => {
  const navigate = useNavigate();
  const apiOn = isPatientsApiEnabled();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<PersonRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PersonRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (apiOn) clearDoctorDischargeMockStorage();
  }, [apiOn]);

  const search = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      return;
    }
    const query = q.trim();
    if (query.length < 2) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRows(await searchPersons(query));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Search failed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiOn, q]);

  useEffect(() => {
    const t = window.setTimeout(() => void search(), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const openDetail = async (p: PersonRecord) => {
    setDetailLoading(true);
    try {
      setDetail(await getPerson(p.personId));
    } catch {
      setDetail(p);
    } finally {
      setDetailLoading(false);
    }
  };

  const goClinical = (p: PersonRecord, path: string, extra?: Record<string, unknown>) => {
    setDocPatientContext({
      id: String(p.personId),
      name: personName(p),
      hospitalId: p.hospitalNo || `PID-${p.personId}`,
      ...extra,
    });
    navigate(path);
  };

  const body = (
    <div className="space-y-4">
      {!apiOn && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          Backend API is not configured.
        </div>
      )}
      {error && apiOn && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryCard title="Results" value={String(rows.length)} icon={Users} />
        <SummaryCard title="Search" value={q.trim().length >= 2 ? 'Live' : 'Type 2+ chars'} icon={Search} />
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search name, hospital no, phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => void search()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Search</span>
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {q.trim().length < 2 ? 'Enter at least 2 characters to search the MPI.' : 'No patients found.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Hospital No</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Sex</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.personId} className="border-t">
                    <td className="p-3 font-mono text-xs">{p.hospitalNo ?? p.personId}</td>
                    <td className="p-3 font-medium">{personName(p)}</td>
                    <td className="p-3">{p.sex ?? '—'}</td>
                    <td className="p-3">{p.patientPhoneNo ?? '—'}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={() => void openDetail(p)}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => goClinical(p, '/dashboard/doctor/clinical/workspace', { autoStartConsult: true })}>
                          Consult
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => goClinical(p, '/dashboard/doctor/clinical/admission')}>
                          Admit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail ? personName(detail) : 'Patient'}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
          ) : detail && (
            <div className="space-y-1 text-sm">
              <p><b>ID:</b> {detail.personId}</p>
              <p><b>Hospital No:</b> {detail.hospitalNo ?? '—'}</p>
              <p><b>Sex:</b> {detail.sex ?? '—'}</p>
              <p><b>Phone:</b> {detail.patientPhoneNo ?? '—'}</p>
              <p><b>DOB:</b> {detail.dateOfBirth ?? '—'}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
            {detail && (
              <Button onClick={() => {
                goClinical(detail, '/dashboard/doctor/clinical/workspace');
                toast.success('Opened clinical workspace');
              }}>
                Open workspace
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <ClinicalPageShell
      shellTitle="Doctor Clinical · Patient Directory"
      flowTitle="Patient Directory"
      flowSubtitle="Search the hospital MPI and open clinical workflows"
    >
      {body}
    </ClinicalPageShell>
  );
};

export default DoctorPatientDirectory;
