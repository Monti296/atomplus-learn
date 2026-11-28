import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { currentUserQueryKey, type CurrentUser } from '../auth/current-user';
import { Button } from '../components/button';
import { GlassCard } from '../components/glass-card';
import { TextField } from '../components/text-field';
import { WakingNotice } from '../components/waking-notice';
import { ApiError, apiRequest } from '../lib/api';

const genericLoginError = 'We could not log you in. Please try again.';

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () =>
      apiRequest<CurrentUser>('/auth/login', {
        method: 'POST',
        body: { email, password },
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user);
      // The session check sends a user who must change the password to that page.
      navigate('/courses', { replace: true });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate();
  }

  const errorMessage = login.isError
    ? login.error instanceof ApiError && login.error.code !== 'UNKNOWN'
      ? login.error.message
      : genericLoginError
    : null;

  return (
    <GlassCard className="mx-auto max-w-md p-6 md:p-8">
      <h1 className="text-2xl font-bold text-ink">Log in</h1>
      <p className="mt-1 text-sm text-ink">
        Use the email and password your admin gave you.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <TextField
          id="login-email"
          label="Work email"
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          id="login-password"
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {errorMessage && (
          <p role="alert" className="text-sm font-semibold text-red-700">
            {errorMessage}
          </p>
        )}

        <WakingNotice active={login.isPending} />

        <Button type="submit" className="w-full" disabled={login.isPending}>
          Log in
        </Button>
      </form>
    </GlassCard>
  );
}
