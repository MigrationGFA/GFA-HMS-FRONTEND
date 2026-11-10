import { ReactNode } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/data/dummyData';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRoleHomePath } from '@/lib/rolePaths';

interface Props {
  roles: readonly UserRole[];
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Route guard — restricts a route to a list of roles.
 * Unauthenticated users are sent to /login; authenticated users with
 * the wrong role see a 403 panel with a link back to their dashboard.
 */
export const RequireRole = ({ roles, children, redirectTo = '/login' }: Props) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <div className="max-w-md w-full rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center mb-4">
            <ShieldAlert className="h-6 w-6 text-rose-600" />
          </div>
          <h1 className="text-xl font-semibold mb-1">403 — Access Denied</h1>
          <p className="text-sm text-muted-foreground mb-1">
            This screen is restricted to: <b>{roles.join(', ')}</b>.
          </p>
          <p className="text-xs text-muted-foreground mb-5">
            You are signed in as <b>{user.name}</b> (<i>{user.role}</i>).
          </p>
          <Button asChild>
            <Link to={getRoleHomePath(user.role)}>Return to my dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireRole;
