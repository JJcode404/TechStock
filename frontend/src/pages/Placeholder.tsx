import { Construction } from 'lucide-react';
import { Card } from '../components/ui/Card';

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-content">{title}</h1>
      <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Construction size={24} />
        </div>
        <p className="font-heading text-lg font-semibold text-content">{title} — coming soon</p>
        <p className="max-w-sm text-sm text-content-muted">
          This screen isn’t built yet. The Dashboard is live and wired to the API; the rest of the
          POS follows the same TechStock Emerald design system.
        </p>
      </Card>
    </div>
  );
}
