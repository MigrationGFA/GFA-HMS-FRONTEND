import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { doctorClinicalNav } from '@/pages/DoctorClinicalCenter';
import { ApiError } from '@/lib/api/client';
import {
  acknowledgeNotification,
  clearDoctorTransferMockStorage,
  isNotificationsApiEnabled,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from '@/lib/api/notifications';
import { Bell, RefreshCw, Loader2, CheckCheck, Eye } from 'lucide-react';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Notifications">
    {children}
  </DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

export const DoctorNotifications = () => {
  const navigate = useNavigate();
  const apiOn = isNotificationsApiEnabled();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'unread' | 'all'>('unread');
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (apiOn) clearDoctorTransferMockStorage();
  }, [apiOn]);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listNotifications({
        unreadOnly: tab === 'unread',
        limit: 100,
      });
      setItems(data.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [apiOn, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.isRead).length,
    [items],
  );

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display">Notifications</h1>
            <p className="text-sm text-muted-foreground">Live inbox from HMS (transfers, system, clinical alerts)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!apiOn || loading}
              onClick={async () => {
                try {
                  await markAllNotificationsRead();
                  toast.success('All marked read');
                  void load();
                } catch (e) {
                  toast.error(e instanceof ApiError ? e.message : 'Failed');
                }
              }}
            >
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          </div>
        </div>

        {!apiOn && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            Backend API is not configured. Mock notification seeds are not used when API mode is on.
          </div>
        )}
        {error && apiOn && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SummaryCard title="Unread (this list)" value={String(unreadCount)} icon={Bell} />
          <SummaryCard title="Loaded" value={String(items.length)} icon={Bell} />
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant={tab === 'unread' ? 'default' : 'outline'} onClick={() => setTab('unread')}>Unread</Button>
          <Button size="sm" variant={tab === 'all' ? 'default' : 'outline'} onClick={() => setTab('all')}>All</Button>
        </div>

        {loading ? (
          <Card className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading notifications…
          </Card>
        ) : items.length === 0 ? (
          <Card className="text-sm text-muted-foreground">No notifications.</Card>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <Card
                key={n.notificationId}
                className={`flex flex-wrap items-start justify-between gap-3 ${n.isRead ? 'opacity-80' : 'border-primary/30'}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-muted">{n.type}</span>
                    {!n.isRead && <span className="text-xs text-primary font-medium">Unread</span>}
                    <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="font-medium mt-1">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
                </div>
                <div className="flex gap-1">
                  {n.linkPath && (
                    <Button size="sm" variant="outline" onClick={() => navigate(n.linkPath!)}>
                      <Eye className="h-4 w-4 mr-1" /> Open
                    </Button>
                  )}
                  {!n.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === n.notificationId}
                      onClick={async () => {
                        setBusyId(n.notificationId);
                        try {
                          await markNotificationRead(n.notificationId);
                          void load();
                        } catch (e) {
                          toast.error(e instanceof ApiError ? e.message : 'Failed');
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Read
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === n.notificationId}
                    onClick={async () => {
                      setBusyId(n.notificationId);
                      try {
                        await acknowledgeNotification(n.notificationId);
                        toast.success('Acknowledged');
                        void load();
                      } catch (e) {
                        toast.error(e instanceof ApiError ? e.message : 'Failed');
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Ack
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
};

export default DoctorNotifications;
