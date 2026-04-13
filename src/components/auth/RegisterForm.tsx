'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { registerSchema, type RegisterInput } from '@/validations/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput | 'root', string>>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
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

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name, phone: data.phone },
      },
    });

    if (error) {
      setErrors({ root: error.message });
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-sm text-muted-foreground mt-1">Join Maningo Method</p>
      </div>

      {errors.root && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {errors.root}
        </div>
      )}

      <Input
        label="Full Name"
        name="full_name"
        type="text"
        autoComplete="name"
        placeholder="Your full name"
        error={errors.full_name}
        required
      />

      <Input
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email}
        required
      />

      <Input
        label="Phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(631) 555-1234"
        error={errors.phone}
        required
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        error={errors.password}
        required
      />

      <Input
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Confirm your password"
        error={errors.confirmPassword}
        required
      />

      <Button type="submit" loading={loading} className="w-full">
        Create Account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground font-medium hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
