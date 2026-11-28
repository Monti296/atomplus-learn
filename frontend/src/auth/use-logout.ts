import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { currentUserQueryKey } from './current-user';

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
    // Clear all cached data, even if the request failed, so no page keeps the old user's data.
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(currentUserQueryKey, null);
    },
  });
}
