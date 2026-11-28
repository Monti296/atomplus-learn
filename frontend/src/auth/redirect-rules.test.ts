import { describe, expect, it } from 'vitest';
import type { CurrentUser } from './current-user';
import { sessionRedirect } from './redirect-rules';

const employee: CurrentUser = {
  id: 'user-1',
  name: 'Asha Rao',
  email: 'asha@atomplus.in',
  role: 'employee',
  mustChangePassword: false,
};

const mustChange: CurrentUser = { ...employee, mustChangePassword: true };

describe('sessionRedirect', () => {
  it('sends a visitor without a session to the login page', () => {
    expect(sessionRedirect(null, '/courses')).toBe('/login');
    expect(sessionRedirect(null, '/')).toBe('/login');
  });

  it('keeps a visitor without a session on the login page', () => {
    expect(sessionRedirect(null, '/login')).toBeNull();
  });

  it('sends a user who must change the password to that page and keeps them there', () => {
    expect(sessionRedirect(mustChange, '/courses')).toBe('/change-password');
    expect(sessionRedirect(mustChange, '/change-password')).toBeNull();
  });

  it('sends a logged-in user away from the login and change-password pages', () => {
    expect(sessionRedirect(employee, '/login')).toBe('/courses');
    expect(sessionRedirect(employee, '/change-password')).toBe('/courses');
  });

  it('lets a logged-in user open the employee pages', () => {
    expect(sessionRedirect(employee, '/my-batch')).toBeNull();
  });
});
