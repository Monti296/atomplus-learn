import { Outlet } from 'react-router';
import { useCurrentUser } from '../auth/current-user';
import { useLogout } from '../auth/use-logout';
import { initialsFor } from '../auth/initials';
import { TopBar } from './top-bar';

export function AppShell() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="isolate min-h-dvh bg-page text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 size-[32rem] rounded-full bg-accent/70 blur-3xl" />
        <div className="absolute top-1/3 -left-32 size-[26rem] rounded-full bg-lilac blur-3xl" />
        <div className="absolute -bottom-40 right-0 size-[30rem] rounded-full bg-accent/60 blur-3xl" />
      </div>

      {user && (
        <TopBar
          userInitials={initialsFor(user.name)}
          showNavigation={!user.mustChangePassword}
          onLogout={() => logout.mutate()}
          isLoggingOut={logout.isPending}
        />
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <Outlet />
      </main>
    </div>
  );
}
