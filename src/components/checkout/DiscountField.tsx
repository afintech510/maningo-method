'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/pricing';

export interface AppliedDiscount {
  code: string;
  discountType: 'percentage' | 'fixed_cents';
  value: number; // percent (0-100) or cents off
}

export interface DiscountState {
  input: string;
  setInput: (s: string) => void;
  applying: boolean;
  applied: AppliedDiscount | null;
  error: string | null;
  applyCode: () => Promise<void>;
  clearCode: () => void;
}

// Shared discount-code state + validation, so a single applied code can be
// reused across payment methods (card and cash/Venmo) on the same checkout.
export function useDiscountCode(): DiscountState {
  const [input, setInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<AppliedDiscount | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyCode() {
    setError(null);
    const code = input.trim().toUpperCase();
    if (!code) return;
    setApplying(true);
    try {
      const res = await fetch('/api/discount-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!data.valid) {
        setError(data.error || 'Invalid code.');
        return;
      }
      setApplied(toAppliedDiscount(data));
    } catch {
      setError('Could not check that code. Try again.');
    } finally {
      setApplying(false);
    }
  }

  function clearCode() {
    setApplied(null);
    setInput('');
    setError(null);
  }

  return { input, setInput, applying, applied, error, applyCode, clearCode };
}

// How many cents this discount knocks off the given base amount.
export function discountCentsFor(applied: AppliedDiscount | null, baseCents: number): number {
  if (!applied) return 0;
  if (applied.discountType === 'fixed_cents') return Math.min(baseCents, applied.value);
  return Math.round(baseCents * (applied.value / 100));
}

// Short label, e.g. "20% off" or "$10 off".
export function discountLabel(applied: AppliedDiscount): string {
  return applied.discountType === 'fixed_cents'
    ? `${formatCents(applied.value)} off`
    : `${applied.value}% off`;
}

// Normalize the /api/discount-codes/validate response into AppliedDiscount.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toAppliedDiscount(data: any): AppliedDiscount {
  return {
    code: data.code,
    discountType: data.discount_type === 'fixed_cents' ? 'fixed_cents' : 'percentage',
    value: Number(data.discount_value),
  };
}

interface Props {
  value: string;
  onChange: (s: string) => void;
  onApply: () => void;
  onClear: () => void;
  applying: boolean;
  applied: AppliedDiscount | null;
  error: string | null;
  className?: string;
}

export function DiscountField({
  value,
  onChange,
  onApply,
  onClear,
  applying,
  applied,
  error,
  className,
}: Props) {
  if (applied) {
    return (
      <div
        className={`rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center justify-between ${className || ''}`}
      >
        <p className="text-sm text-emerald-800">
          <span className="font-semibold">{applied.code}</span> applied &middot; {discountLabel(applied)}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-emerald-800 underline hover:no-underline"
        >
          Remove
        </button>
      </div>
    );
  }
  return (
    <div className={className}>
      <label className="block text-xs uppercase tracking-wider text-[#6b6b6b] font-medium mb-1.5">
        Discount code
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="Enter code"
          className="flex-1 h-11 px-3 rounded-lg border border-[#e5e2dc] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
        />
        <Button size="sm" onClick={onApply} loading={applying} disabled={!value.trim()}>
          Apply
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
