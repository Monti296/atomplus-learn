import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { currentUserQueryKey, type CurrentUser } from '../auth/current-user';
import { Button } from '../components/button';
import { GlassCard } from '../components/glass-card';
import { TextField } from '../components/text-field';
import { WakingNotice } from '../components/waking-notice';
import { ApiError, apiRequest } from '../lib/api';

const passwordRules =
  'Longer than 6 characters, with one uppercase letter, one number, one symbol, and no character repeated three times in a row.';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const changePassword = useMutation({
    mutationFn: () =>
      apiRequest<void>('/me/password', {
        method: 'PATCH',
        body: { currentPassword, newPassword },
      }),
    onSuccess: () => {
      queryClient.setQueryData<CurrentUser | null>(
        currentUserQueryKey,
        (user) => (user ? { ...user, mustChangePassword: false } : user),
      );
      navigate('/courses', { replace: true });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    changePassword.mutate();
  }

  const errorMessage = changePassword.isError
    ? changePassword.error instanceof ApiError &&
      changePassword.error.code !== 'UNKNOWN'
      ? changePassword.error.message
      : 'We could not change your password. Please try again.'
    : null;

  return (
    <GlassCard className="mx-auto max-w-md p-6 md:p-8">
      <h1 className="text-2xl font-bold text-ink">Choose a new password</h1>
      <p className="mt-1 text-sm text-ink">
        Your admin gave you a temporary password. Please set your own before
        you continue.
      </p>
      <p className="mt-3 text-sm text-ink">{passwordRules}</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <TextField
          id="current-password"
          label="Temporary password"
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <TextField
          id="new-password"
          label="New password"
          type="password"
          name="newPassword"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <TextField
          id="confirm-password"
          label="Repeat new password"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {mismatch && (
          <p role="alert" className="text-sm font-semibold text-red-700">
            The two new passwords do not match.
          </p>
        )}
        {errorMessage && (
          <p role="alert" className="text-sm font-semibold text-red-700">
            {errorMessage}
          </p>
        )}

        <WakingNotice active={changePassword.isPending} />

        <Button
          type="submit"
          className="w-full"
          disabled={changePassword.isPending}
        >
          Save new password
        </Button>
      </form>
    </GlassCard>
  );
}
