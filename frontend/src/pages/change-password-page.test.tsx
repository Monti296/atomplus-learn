import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ChangePasswordPage } from './change-password-page';

function renderChangePassword() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/change-password']}>
        <Routes>
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/courses" element={<p>Courses page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ChangePasswordPage', () => {
  it('does not call the API when the two new passwords differ', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderChangePassword();

    fill('Temporary password', 'Temp#1abc');
    fill('New password', 'NewPass#2');
    fill('Repeat new password', 'NewPass#3');
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(screen.getByRole('alert').textContent).toBe(
      'The two new passwords do not match.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the new password and opens the courses page after saving', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    renderChangePassword();

    fill('Temporary password', 'Temp#1abc');
    fill('New password', 'NewPass#2');
    fill('Repeat new password', 'NewPass#2');
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(await screen.findByText('Courses page')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/password',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: 'Temp#1abc',
          newPassword: 'NewPass#2',
        }),
      }),
    );
  });

  it('shows the server rule message when the new password is too weak', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { code: 'WEAK_PASSWORD', message: 'Use at least one symbol.' },
            { status: 400 },
          ),
        ),
    );
    renderChangePassword();

    fill('Temporary password', 'Temp#1abc');
    fill('New password', 'weakpass');
    fill('Repeat new password', 'weakpass');
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Use at least one symbol.');
  });
});
