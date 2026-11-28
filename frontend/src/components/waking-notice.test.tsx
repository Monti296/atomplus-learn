import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { WakingNotice } from './waking-notice';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('WakingNotice', () => {
  it('shows nothing when no request is running', () => {
    render(<WakingNotice active={false} />);

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('says to wait at first, then explains the server is waking up', () => {
    vi.useFakeTimers();
    render(<WakingNotice active />);

    expect(screen.getByRole('status').textContent).toBe('Please wait...');

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByRole('status').textContent).toContain(
      'The server is waking up.',
    );
  });
});
