'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { resetPasswordSchema } from '@/validations/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();

  // Recovery flows arrive with either a `code` (PKCE) or a token in the URL
  // hash. The Supabase client picks up the hash automatically; for the code
  // path we exchange explicitly. Until a recovery session is established,
  // submit is disabled.
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; root?: string }>({});

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function init() {
      const code = params?.get('code');
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setReady(true);
        } else {
          setLinkError(
            'This reset link is invalid or has expired. Request a new one to continue.'
          );
        }
      } catch (err) {
        if (cancelled) return;
        setLinkError(err instanceof Error ? err.message : 'Could not verify reset link.');
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [params]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      password: (formData.get('password') as string) || '',
      confirmPassword: (formData.get('confirmPassword') as string) || '',
    };

    const result = resetPasswordSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as 'password' | 'confirmPassword';
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      setErrors({ root: error.message });
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    setTimeout(() => router.push('/dashboard'), 1500);
  }

  if (linkError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold">Reset link expired</h1>
          <p className="text-sm text-muted-foreground">{linkError}</p>
          <Link
            href="/forgot-password"
            className="inline-block text-sm font-medium text-[#c9a96e] hover:underline"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto text-center">
          <div className="text-3xl mb-2">&#10003;</div>
          <h1 className="text-2xl font-bold mb-2">Password updated</h1>
          <p className="text-sm text-muted-foreground">Redirecting you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose something at least 8 characters.
          </p>
        </div>

        {errors.root && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {errors.root}
          </div>
        )}

        <Input
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password}
          required
          disabled={!ready}
        />
        <Input
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter the password"
          error={errors.confirmPassword}
          required
          disabled={!ready}
        />

        <Button type="submit" loading={loading} disabled={!ready} className="w-full">
          {ready ? 'Update password' : 'Verifying link…'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-foreground font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
