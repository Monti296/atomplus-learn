import type { CurrentUser } from './current-user';

// Returns the page to send the visitor to, or null when the page may stay open.
// The server enforces the same rules; this only keeps the screens in step with it.
export function sessionRedirect(
  user: CurrentUser | null,
  pathname: string,
): string | null {
  if (!user) {
    return pathname === '/login' ? null : '/login';
  }

  if (user.mustChangePassword) {
    return pathname === '/change-password' ? null : '/change-password';
  }

  if (pathname === '/login' || pathname === '/change-password') {
    return '/courses';
  }

  return null;
}
