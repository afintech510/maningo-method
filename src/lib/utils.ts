import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://maningo.hosthampton.com';
}
