import { Outlet } from 'react-router';
import { TopBar } from './top-bar';

// Placeholder until login is built (T-012). The real initials come from the signed-in user.
const placeholderInitials = 'AP';

export function AppShell() {
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

      <TopBar userInitials={placeholderInitials} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <Outlet />
      </main>
    </div>
  );
}
