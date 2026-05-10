import { describe, it, expect } from 'vitest';
import {
  generateGiftCode,
  normalizeGiftCode,
  isValidGiftCodeFormat,
} from '@/lib/gift-codes';

describe('gift-codes', () => {
  it('generated codes match MM-XXXX-XXXX-XXXX format', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateGiftCode();
      expect(code).toMatch(/^MM-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    }
  });

  it('alphabet excludes ambiguous characters (I, O, 0, 1)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateGiftCode();
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it('normalizeGiftCode strips dashes / spaces and uppercases', () => {
    expect(normalizeGiftCode('mm-abcd-efgh-jkmn')).toBe('MMABCDEFGHJKMN');
    expect(normalizeGiftCode('  MM ABCD EFGH JKMN ')).toBe('MMABCDEFGHJKMN');
  });

  it('isValidGiftCodeFormat accepts well-formed codes', () => {
    expect(isValidGiftCodeFormat('MM-ABCD-EFGH-JKMN')).toBe(true);
    expect(isValidGiftCodeFormat('mm-abcd-efgh-jkmn')).toBe(true);
    expect(isValidGiftCodeFormat('MMABCDEFGHJKMN')).toBe(true);
  });

  it('isValidGiftCodeFormat rejects malformed codes', () => {
    expect(isValidGiftCodeFormat('MM-AB-CD-EF')).toBe(false); // too short
    expect(isValidGiftCodeFormat('XX-ABCD-EFGH-JKMN')).toBe(false); // wrong prefix
    expect(isValidGiftCodeFormat('')).toBe(false);
    expect(isValidGiftCodeFormat('not a code')).toBe(false);
  });
});
