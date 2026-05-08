// Gift code generator. Format: MM-XXXX-XXXX-XXXX where X is uppercase
// alphanum minus ambiguous chars (no I, O, 0, 1).

import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars

export function generateGiftCode(): string {
  const bytes = crypto.randomBytes(12);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `MM-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

export function normalizeGiftCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

// Format: MM-XXXX-XXXX-XXXX (after stripping dashes that's 14 chars including MM prefix)
export function isValidGiftCodeFormat(input: string): boolean {
  const normalized = normalizeGiftCode(input);
  return /^MM[A-Z2-9]{12}$/.test(normalized);
}
