import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/validations/auth';

describe('registerSchema', () => {
  const baseValid = {
    full_name: 'Alex Tester',
    email: 'alex@example.com',
    phone: '6315551234',
    password: 'longenough',
    confirmPassword: 'longenough',
    tos_accepted: true,
    sms_consent: true,
    sms_marketing_consent: false,
    email_marketing_consent: false,
  };

  it('accepts a valid payload', () => {
    expect(registerSchema.safeParse(baseValid).success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const r = registerSchema.safeParse({ ...baseValid, confirmPassword: 'different' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues[0].message;
      expect(msg).toMatch(/match/i);
    }
  });

  it('rejects missing TOS acceptance', () => {
    const r = registerSchema.safeParse({ ...baseValid, tos_accepted: false });
    expect(r.success).toBe(false);
  });

  it('rejects too-short password', () => {
    const r = registerSchema.safeParse({ ...baseValid, password: 'short', confirmPassword: 'short' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const r = registerSchema.safeParse({ ...baseValid, email: 'not-an-email' });
    expect(r.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts email + password', () => {
    expect(
      loginSchema.safeParse({ email: 'alex@example.com', password: 'x' }).success
    ).toBe(true);
  });
  it('rejects empty password', () => {
    expect(
      loginSchema.safeParse({ email: 'alex@example.com', password: '' }).success
    ).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'alex@example.com' }).success).toBe(true);
  });
  it('rejects an invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts matching strong-enough passwords', () => {
    expect(
      resetPasswordSchema.safeParse({
        password: 'longenough',
        confirmPassword: 'longenough',
      }).success
    ).toBe(true);
  });
  it('rejects mismatched passwords', () => {
    expect(
      resetPasswordSchema.safeParse({
        password: 'longenough',
        confirmPassword: 'different',
      }).success
    ).toBe(false);
  });
  it('rejects short passwords', () => {
    expect(
      resetPasswordSchema.safeParse({
        password: 'short',
        confirmPassword: 'short',
      }).success
    ).toBe(false);
  });
});
