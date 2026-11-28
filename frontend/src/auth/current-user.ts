import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

export const currentUserQueryKey = ['me'] as const;

// A 401 means "not logged in", which is a normal answer, not an error.
// Network failures are retried, because the free server may still be waking up.
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: async (): Promise<CurrentUser | null> => {
      try {
        return await apiRequest<CurrentUser>('/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: (failureCount, error) =>
      !(error instanceof ApiError) && failureCount < 5,
  });
}
