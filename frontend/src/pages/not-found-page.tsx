import { Link } from 'react-router';
import { GlassCard } from '../components/glass-card';

export function NotFoundPage() {
  return (
    <GlassCard className="p-6">
      <h1 className="text-2xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 text-indigo">The page you asked for does not exist.</p>
      <Link
        to="/courses"
        className="mt-4 inline-flex min-h-10 items-center font-semibold text-ink underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Go to Courses
      </Link>
    </GlassCard>
  );
}
