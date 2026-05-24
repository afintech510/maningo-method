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

  // Recovery flows arrive in one of two shapes:
  //   1. token_hash + type=recovery   — preferred (since inbox prefetchers
  //      hit the page without consuming the token; we verify on submit).
  //   2. code                          — old PKCE flow, exchanged on mount.
  // Old-style ?code= links remain in flight from earlier sends; both work.
  const tokenHash = params?.get('token_hash') || null;
  const tokenType = params?.get('type') || null;
  const code = params?.get('code') || null;

  const [pkceReady, setPkceReady] = useState(!code);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; root?: string }>({});

  // For the legacy code-only flow we still pre-exchange on mount. For the
  // token_hash flow we DO NOT verify here — that would let inbox prefetchers
  // burn the token before the human clicks Submit.
  useEffect(() => {
    if (!code) return;
    const supabase = createClient();
    let cancelled = false;

    async function init() {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code!);
        if (cancelled) return;
        if (error) {
          setLinkError(
            'This reset link is invalid or has expired. Request a new one to continue.'
          );
          return;
        }
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setPkceReady(true);
        } else {
          setLinkError('This reset link is invalid or has expired. Request a new one to continue.');
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
  }, [code]);

  // The form is interactable as soon as the page loads when we have a
  // token_hash; for PKCE we wait for the exchange to land.
  const ready = !!tokenHash || pkceReady;

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

    // For the token_hash flow, consume the token now (creates a recovery
    // session). PKCE links already exchanged on mount.
    if (tokenHash) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: verifyErr } = await (supabase.auth as any).verifyOtp({
        token_hash: tokenHash,
        type: (tokenType as 'recovery') || 'recovery',
      });
      if (verifyErr) {
        setErrors({
          root:
            'This reset link is invalid or has expired. Request a new one to continue.',
        });
        setLoading(false);
        return;
      }
    }

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
            {/^this reset link/i.test(errors.root) && (
              <>
                {' '}
                <Link href="/forgot-password" className="font-medium underline">
                  Request a new one
                </Link>
                .
              </>
            )}
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
