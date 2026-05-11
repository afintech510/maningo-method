'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';

export function ReferralCard({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);
  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${referralCode}`;

  function handleCopy() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="border-[#c9a96e]/30 bg-[#c9a96e]/5">
      <p className="font-semibold text-sm mb-1">Refer a Friend, Get a Free Class</p>
      <p className="text-xs text-muted-foreground mb-3">
        Share your link. When a friend signs up and buys their first class pack, you get a
        <strong className="text-foreground"> free class credit</strong>. One credit per friend
        you bring in.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={referralLink}
          className="flex-1 h-9 px-3 text-xs rounded-lg border border-border bg-white truncate"
        />
        <button
          onClick={handleCopy}
          className="h-9 px-4 rounded-lg bg-[#c9a96e] text-white text-xs font-medium hover:bg-[#b8955d] transition-colors flex-shrink-0"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Your code: <span className="font-mono font-medium">{referralCode}</span>
      </p>
    </Card>
  );
}
