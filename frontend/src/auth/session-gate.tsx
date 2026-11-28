import { Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '../components/button';
import { GlassCard } from '../components/glass-card';
import { WakingNotice } from '../components/waking-notice';
import { useCurrentUser } from './current-user';
import { sessionRedirect } from './redirect-rules';

// Wraps every page: waits for the session check, then shows the page or redirects.
export function SessionGate() {
  const location = useLocation();
  const { data, isPending, isError, refetch } = useCurrentUser();

  if (isPending) {
    return (
      <GlassCard className="mx-auto max-w-md p-6">
        <WakingNotice active />
      </GlassCard>
    );
  }

  if (isError) {
    return (
      <GlassCard className="mx-auto max-w-md p-6">
        <p className="text-ink">We could not reach the server.</p>
        <Button className="mt-4 w-full" onClick={() => void refetch()}>
          Try again
        </Button>
      </GlassCard>
    );
  }

  const target = sessionRedirect(data ?? null, location.pathname);
  if (target) {
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
