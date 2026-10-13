import { maskDestination, maskEmail, maskPhone } from './mask';

describe('destination masking', () => {
  it('masks emails like the design copy', () => {
    expect(maskEmail('you@example.com')).toBe('you@ex•••.com');
    expect(maskEmail('someone.long@gmail.co')).toBe('som•••@gm•••.co');
  });

  it('masks phones keeping the country code, prefix and last 4 digits', () => {
    expect(maskPhone('+923001234567')).toBe('+92 300 •••4567');
  });

  it('never returns the full destination', () => {
    expect(maskDestination('EMAIL', 'someone.long@gmail.com')).not.toContain('someone.long');
    expect(maskDestination('PHONE', '+923001234567')).not.toContain('3001234567');
  });
});
