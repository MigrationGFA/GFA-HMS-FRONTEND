import {
  fetchDoctorOverview,
  isDoctorOverviewApiEnabled,
  type DoctorOverviewPayload,
} from './doctorOverview';
import {
  acknowledgeImagingReport,
  isImagingApiEnabled,
  listImagingReports,
  listImagingRequests,
  type ApiImagingReport,
  type ApiImagingRequest,
} from './imaging';
import {
  acknowledgeLabResult,
  isLaboratoryApiEnabled,
  listLabRequests,
  listLabResults,
  type ApiLabRequest,
  type ApiLabResult,
} from './laboratory';
import {
  acknowledgeNotification,
  isNotificationsApiEnabled,
  listNotifications,
  type ApiNotification,
} from './notifications';
import {
  isReferralsApiEnabled,
  listReferrals,
  type ApiReferral,
} from './referrals';

export const OPEN_REFERRAL_STATUSES =
  'Submitted,UnderReview,QueuedForDept,AwaitingBed,BedAllocated,Accepted,InAttendance,Returned';

export const COMPLETED_REFERRAL_STATUSES =
  'Completed,ClearedExternal,Rejected,Cancelled,Admitted';

export type CrossDeptAggregates = {
  pendingReferrals: ApiReferral[];
  completedReferrals: ApiReferral[];
  criticalLab: ApiLabResult[];
  criticalImaging: ApiImagingReport[];
  unreadNotifications: ApiNotification[];
  pendingLabRequests: ApiLabRequest[];
  pendingImagingRequests: ApiImagingRequest[];
  overview: DoctorOverviewPayload | null;
};

export function isCrossDeptApiEnabled(): boolean {
  return isReferralsApiEnabled();
}

/** Clear legacy cross-dept mock keys when live API is on. */
export function clearDoctorCrossDeptMockStorage(): void {
  if (typeof localStorage === 'undefined') return;
  const keys = [
    'gfa_doc_crossdept_modules_v1',
    'gfa_doc_crossdept_pending_v1',
    'gfa_doc_crossdept_messages_v1',
    'gfa_doc_crossdept_requests_v1',
    'gfa_doc_crossdept_critical_v1',
    'gfa_doc_crossdept_completed_v1',
    'gfa_doc_crossdept_sync_v1',
    'gfa_doc_crossdept_audit_v1',
    'gfa_doc_crossdept_timeline_v1',
  ];
  for (const k of keys) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export async function fetchCrossDeptAggregates(): Promise<CrossDeptAggregates> {
  const referralsOn = isReferralsApiEnabled();
  const labOn = isLaboratoryApiEnabled();
  const imagingOn = isImagingApiEnabled();
  const notificationsOn = isNotificationsApiEnabled();
  const overviewOn = isDoctorOverviewApiEnabled();

  const [
    pendingReferrals,
    completedReferrals,
    criticalLab,
    criticalImaging,
    unreadNotifications,
    pendingLabRequests,
    pendingImagingRequests,
    overview,
  ] = await Promise.all([
    referralsOn
      ? listReferrals({ scope: 'mine', status: OPEN_REFERRAL_STATUSES, limit: 100 }).then((p) => p.items)
      : Promise.resolve([] as ApiReferral[]),
    referralsOn
      ? listReferrals({ scope: 'mine', status: COMPLETED_REFERRAL_STATUSES, limit: 100 }).then((p) => p.items)
      : Promise.resolve([] as ApiReferral[]),
    labOn
      ? listLabResults({ critical: true, page: 1, limit: 100 }).then((p) => p.items)
      : Promise.resolve([] as ApiLabResult[]),
    imagingOn
      ? listImagingReports({ critical: true, page: 1, limit: 100 }).then((p) => p.items)
      : Promise.resolve([] as ApiImagingReport[]),
    notificationsOn
      ? listNotifications({ unreadOnly: true, page: 1, limit: 100 }).then((p) => p.items)
      : Promise.resolve([] as ApiNotification[]),
    labOn
      ? listLabRequests({ status: 'Sent', page: 1, limit: 100 }).then((p) => p.items)
      : Promise.resolve([] as ApiLabRequest[]),
    imagingOn
      ? listImagingRequests({ status: 'Submitted,Scheduled,InProgress', page: 1, limit: 100 }).then(
          (p) => p.items,
        )
      : Promise.resolve([] as ApiImagingRequest[]),
    overviewOn ? fetchDoctorOverview({ queueLimit: 0 }) : Promise.resolve(null),
  ]);

  return {
    pendingReferrals,
    completedReferrals,
    criticalLab,
    criticalImaging,
    unreadNotifications,
    pendingLabRequests,
    pendingImagingRequests,
    overview,
  };
}

export { acknowledgeImagingReport, acknowledgeLabResult, acknowledgeNotification };
