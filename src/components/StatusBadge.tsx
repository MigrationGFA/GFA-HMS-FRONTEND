interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const s = status.toLowerCase();
  let cls = 'badge-neutral';

  if (['paid','active','confirmed','completed','enrolled','approved','resolved','successful','present','verified','attended','synced','dispensed','released','recovered','available'].includes(s)) {
    cls = 'badge-success';
  } else if (['pending','outpatient','admitted','warning','in progress','scheduled','medium','open','late','approaching','sample collected','result ready','retrying','reserved','pending approval','improved'].includes(s)) {
    cls = 'badge-warning';
  } else if (['partial','low','on leave'].includes(s)) {
    cls = 'badge-partial';
  } else if (['info','occupied','sms pay link','ussd','referred'].includes(s)) {
    cls = 'badge-info';
  } else if (['failed','cancelled','absent','down','critical','expired','out of stock','dama','mortality','maintenance'].includes(s)) {
    cls = 'badge-danger';
  } else if (['unpaid'].includes(s)) {
    cls = 'badge-neutral';
  } else if (['online card','wallet','pos card','cash','bank transfer'].includes(s)) {
    cls = 'badge-info';
  }

  return <span className={cls}>{status}</span>;
};

export default StatusBadge;
