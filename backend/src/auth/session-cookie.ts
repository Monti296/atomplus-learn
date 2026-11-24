import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'atomplus_session';

export const SESSION_IDLE_LIFETIME_MS = 5 * 24 * 60 * 60 * 1000;

// 32 random bytes encoded as base64url is always 43 characters
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function readSessionId(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE_NAME) {
      continue;
    }

    const value = part.slice(separator + 1).trim();
    return SESSION_ID_PATTERN.test(value) ? value : null;
  }

  return null;
}

// Browsers send this cookie only to the same site (for example learn.atomplus.in and api.atomplus.in).
export function sessionCookieOptions(
  domain: string | undefined,
): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    domain,
  };
}
