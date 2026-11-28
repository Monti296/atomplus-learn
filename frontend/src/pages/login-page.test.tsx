import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { LoginPage } from './login-page';

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/courses" element={<p>Courses page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Work email'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  it('sends the email and password to the login API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          id: 'user-1',
          name: 'Asha Rao',
          email: 'asha@atomplus.in',
          role: 'employee',
          mustChangePassword: false,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderLogin();

    fillAndSubmit('asha@atomplus.in', 'Secret#1');

    expect(await screen.findByText('Courses page')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'asha@atomplus.in',
          password: 'Secret#1',
        }),
      }),
    );
  });

  it('shows the server message when the login is refused', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { code: 'INVALID_CREDENTIALS', message: 'Email or password is wrong.' },
            { status: 401 },
          ),
        ),
    );
    renderLogin();

    fillAndSubmit('asha@atomplus.in', 'wrong');

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Email or password is wrong.');
    expect(screen.queryByText('Courses page')).toBeNull();
  });

  it('shows a generic message when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    renderLogin();

    fillAndSubmit('asha@atomplus.in', 'Secret#1');

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('We could not log you in. Please try again.');
  });
});
