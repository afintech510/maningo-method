import { Card } from '@/components/ui/Card';

export function CreditBalance({ credits }: { credits: number }) {
  return (
    <Card className={credits > 0 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
      <div className="text-center py-2">
        <p className="text-4xl font-bold">{credits}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {credits === 1 ? 'class remaining' : 'classes remaining'}
        </p>
      </div>
    </Card>
  );
}
