// REVIEW-XXXXXX — short, copyable, single-use. Removed 0/O/1/I/L
// because they read ambiguously when a member is squinting at a phone.
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateDiscountCode(prefix = 'REVIEW'): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `${prefix}-${suffix}`;
}
