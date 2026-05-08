'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { registerSchema, type RegisterInput } from '@/validations/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function RegisterForm() {
  const searchParams = useSearchParams();
  const packParam = searchParams?.get('pack') || null;
  const refParam = searchParams?.get('ref') || null;

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput | 'root', string>>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const marketingOptIn = formData.get('marketing_opt_in') === 'on';
    const data = {
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      tos_accepted: formData.get('tos_accepted') === 'on',
      sms_consent: true, // transactional consent given by providing a phone for service messages
      sms_marketing_consent: marketingOptIn,
      email_marketing_consent: marketingOptIn,
    };

    const result = registerSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof RegisterInput;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...result.data, referral_code: refParam || undefined }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErrors({ root: json?.error?.message || 'Could not create account' });
      setLoading(false);
      return;
    }

    if (packParam) {
      window.location.href = `/checkout/pay?kind=pack&pack=${packParam}`;
      return;
    }
    window.location.href = '/dashboard';
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {packParam ? 'One step before checkout' : 'Join Maningo Method'}
        </p>
      </div>

      {errors.root && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {errors.root}
        </div>
      )}

      <Input label="Full Name" name="full_name" type="text" autoComplete="name" placeholder="Your full name" error={errors.full_name} required />
      <Input label="Email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" error={errors.email} required />
      <Input label="Phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(631) 555-1234" error={errors.phone} required />
      <Input label="Password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" error={errors.password} required />
      <Input label="Confirm Password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Confirm your password" error={errors.confirmPassword} required />

      <div className="space-y-3 pt-2">
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input type="checkbox" name="tos_accepted" required className="mt-0.5 h-4 w-4 rounded border-[#e5e2dc] text-[#c9a96e] focus:ring-[#c9a96e]" />
          <span className="text-[#2d2d2d]">
            I agree to the{' '}
            <Link href="/terms" target="_blank" className="text-[#c9a96e] underline">Terms</Link>,{' '}
            <Link href="/privacy" target="_blank" className="text-[#c9a96e] underline">Privacy Policy</Link>, and{' '}
            <a href="/Maningo_Method_Pilates_Waiver_v3.pdf" target="_blank" rel="noopener noreferrer" className="text-[#c9a96e] underline">Liability Waiver</a>.{' '}
            <span className="text-red-600">*</span>
          </span>
        </label>
        {errors.tos_accepted && <p className="text-xs text-red-600 pl-7 -mt-2">{errors.tos_accepted}</p>}

        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input type="checkbox" name="marketing_opt_in" className="mt-0.5 h-4 w-4 rounded border-[#e5e2dc] text-[#c9a96e] focus:ring-[#c9a96e]" />
          <span className="text-[#6b6b6b] leading-relaxed">
            Send me promotional texts and emails (new classes, offers, studio news). Optional. Msg &amp; data rates may apply. Reply STOP to opt out.
          </span>
        </label>
      </div>

      <p className="text-[11px] text-[#9a9a9a] leading-relaxed">
        By creating an account you provide your number for class reminders, booking confirmations, and account alerts. We never share your number. Promotional messages only sent if you check the box above.
      </p>

      <Button type="submit" loading={loading} className="w-full">
        {packParam ? 'Create Account & Continue to Payment' : 'Create Account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={`/login${packParam ? `?pack=${packParam}` : ''}`} className="text-foreground font-medium hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
