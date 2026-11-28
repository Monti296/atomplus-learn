import { useEffect, useState } from 'react';

const slowAfterMs = 3000;

// Free hosting can take about a minute to wake up, so after a few seconds we say so.
export function WakingNotice({ active }: { active: boolean }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), slowAfterMs);
    return () => {
      window.clearTimeout(timer);
      setSlow(false);
    };
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <p role="status" className="text-sm text-ink">
      {slow
        ? 'The server is waking up. This can take about a minute. Thank you for waiting.'
        : 'Please wait...'}
    </p>
  );
}
