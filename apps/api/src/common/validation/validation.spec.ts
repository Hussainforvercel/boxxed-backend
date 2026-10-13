import { isPhoneE164 } from './is-phone-e164';
import { normalizeEmail, normalizePhone, trim } from './transforms';

describe('phone normalization and validation', () => {
  it.each(['+92 300 1234567', '+92-300-123-4567', '+923001234567', ' +92 (300) 1234567 '])(
    'normalizes %p to E.164',
    (input) => {
      expect(normalizePhone(input)).toBe('+923001234567');
      expect(isPhoneE164(normalizePhone(input))).toBe(true);
    },
  );

  it.each(['03001234567', '+92300', 'not a phone', '+999999999999', ''])('rejects %p', (input) => {
    expect(isPhoneE164(normalizePhone(input))).toBe(false);
  });
});

describe('string transforms', () => {
  it('lowercases and trims emails', () => {
    expect(normalizeEmail('  You@Example.COM ')).toBe('you@example.com');
  });

  it('trims strings only', () => {
    expect(trim({ value: '  Ali  ' })).toBe('Ali');
    expect(trim({ value: 5 })).toBe(5);
  });
});
