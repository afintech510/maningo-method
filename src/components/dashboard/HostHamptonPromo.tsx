import Image from 'next/image';
import { Card } from '@/components/ui/Card';

export function HostHamptonPromo() {
  return (
    <Card className="border-[#c9a96e]/30 bg-[#c9a96e]/5">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white border border-[#e5e2dc] flex items-center justify-center flex-shrink-0 p-2">
          <Image
            src="/hh-logo-1200-sq.png"
            alt="Host Hampton"
            width={120}
            height={120}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#c9a96e] mb-1">
            Earn 2 free classes
          </p>
          <p className="font-semibold text-sm leading-snug">
            Book a party or event with Host Hampton &mdash; get <span className="text-[#c9a96e]">2 free Maningo Method classes</span>.
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Kids theme parties, mobile party services, private studio rental, DIY parties &mdash; the works.
          </p>
          <a
            href="https://hosthampton.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-9 px-4 mt-3 rounded-full bg-[#2d2d2d] text-white text-xs font-medium hover:bg-[#1a1a1a] transition-colors"
          >
            Book at hosthampton.com &rarr;
          </a>
          <p className="text-[10px] text-muted-foreground mt-2">
            Mention you&rsquo;re a Maningo member when you book and credits will land on your dashboard.
          </p>
        </div>
      </div>
    </Card>
  );
}
