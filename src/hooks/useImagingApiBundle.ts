import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import {
  getCriticalFindings,
  getRadiologyMetrics,
  isImagingApiEnabled,
  listEcgStudies,
  listImagingRequests,
  listImagingStudies,
  listRadConsumables,
  listRadEquipment,
  listRadiologyReports,
  type ApiEcgStudy,
  type ApiImagingRequest,
  type ApiImagingStudy,
  type ApiRadConsumable,
  type ApiRadEquipment,
  type ApiRadMetrics,
  type ApiRadiologyReport,
} from '@/lib/api/imaging';

/** Shared loader for radiology dual-mode pages (Phases 1–4). */
export function useImagingApiBundle(opts?: { status?: string; workQueue?: boolean; auto?: boolean }) {
  const apiOn = isImagingApiEnabled();
  const [requests, setRequests] = useState<ApiImagingRequest[]>([]);
  const [studies, setStudies] = useState<ApiImagingStudy[]>([]);
  const [reports, setReports] = useState<ApiRadiologyReport[]>([]);
  const [ecgs, setEcgs] = useState<ApiEcgStudy[]>([]);
  const [metrics, setMetrics] = useState<ApiRadMetrics | null>(null);
  const [equipment, setEquipment] = useState<ApiRadEquipment[]>([]);
  const [consumables, setConsumables] = useState<ApiRadConsumable[]>([]);
  const [critical, setCritical] = useState<{ reports: ApiRadiologyReport[]; ecgs: ApiEcgStudy[] }>({
    reports: [],
    ecgs: [],
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!apiOn) return;
    setLoading(true);
    try {
      const [reqPage, studyList, reportList, ecgPage, m, eq, cons, crit] = await Promise.all([
        listImagingRequests({
          status: opts?.status,
          workQueue: opts?.workQueue,
          page: 1,
          limit: 200,
        }),
        listImagingStudies({ status: 'Active' }).catch(() => [] as ApiImagingStudy[]),
        listRadiologyReports().catch(() => [] as ApiRadiologyReport[]),
        listEcgStudies().catch(() => [] as ApiEcgStudy[]),
        getRadiologyMetrics().catch(() => null),
        listRadEquipment().catch(() => [] as ApiRadEquipment[]),
        listRadConsumables().catch(() => [] as ApiRadConsumable[]),
        getCriticalFindings().catch(() => ({ reports: [], ecgs: [] })),
      ]);
      setRequests(reqPage.items);
      setStudies(studyList);
      setReports(reportList);
      setEcgs(ecgPage);
      setMetrics(m);
      setEquipment(eq);
      setConsumables(cons);
      setCritical(crit);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load radiology data from API');
    } finally {
      setLoading(false);
    }
  }, [apiOn, opts?.status, opts?.workQueue]);

  useEffect(() => {
    if (apiOn && opts?.auto !== false) void refresh();
  }, [apiOn, refresh, opts?.auto]);

  return {
    apiOn,
    loading,
    refresh,
    requests,
    studies,
    reports,
    ecgs,
    metrics,
    equipment,
    consumables,
    critical,
  };
}
