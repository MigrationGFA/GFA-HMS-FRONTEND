import type { ReactNode } from 'react';
import { useDbReady } from '@/contexts/DatabaseProvider';
import { PageBootSkeleton } from '@/components/DataSkeletons';

export function DbBootGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const ready = useDbReady();
  if (!ready) return <>{fallback ?? <PageBootSkeleton />}</>;
  return <>{children}</>;
}
