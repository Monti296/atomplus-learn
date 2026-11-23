import { GlassCard } from '../components/glass-card';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div>
      <h1 className="text-4xl font-bold text-ink md:text-5xl">{title}</h1>
      <p className="mt-2 text-lg text-indigo">{description}</p>
      <GlassCard className="mt-8 p-6">
        <p className="text-ink">This page is built in a later task.</p>
      </GlassCard>
    </div>
  );
}
