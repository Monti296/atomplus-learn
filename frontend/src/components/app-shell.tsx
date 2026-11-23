import { Outlet } from 'react-router';
import { TopBar } from './top-bar';

// Placeholder until login is built (T-012). The real initials come from the signed-in user.
const placeholderInitials = 'AP';

export function AppShell() {
  return (
    <div className="min-h-dvh bg-page text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-lilac opacity-80 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 size-[28rem] rounded-full bg-accent/40 blur-3xl" />
      </div>

      <TopBar userInitials={placeholderInitials} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <Outlet />
      </main>
    </div>
  );
}
