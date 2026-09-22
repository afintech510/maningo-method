import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export function GiftCardCard() {
  return (
    <Card className="border-[#c9a96e]/30 bg-gradient-to-br from-[#c9a96e]/10 via-[#faf9f6] to-white">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#c9a96e]/15 flex items-center justify-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c9a96e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="8" width="18" height="13" rx="2" />
            <path d="M3 12h18" />
            <path d="M12 8v13" />
            <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 12 5.5 12 8c0-2.5 2.5-5 4.5-5a2.5 2.5 0 0 1 0 5" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm mb-1">Give a Maningo Method Gift</p>
          <p className="text-xs text-muted-foreground mb-3">
            A drop-in, 5-pack, 10-pack, or any custom amount. We&rsquo;ll generate a unique code
            and email it to them — or to you to deliver however you like.
          </p>
          <Link
            href="/gift/new"
            className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#c9a96e] text-white text-xs font-medium hover:bg-[#b8955d] transition-colors"
          >
            Buy a gift card &rarr;
          </Link>
        </div>
      </div>
    </Card>
  );
}
