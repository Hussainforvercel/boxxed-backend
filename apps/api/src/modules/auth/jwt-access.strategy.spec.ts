import { JwtAccessStrategy } from './jwt-access.strategy';

import type { AppConfig } from '../../config/app-config.service';

const config = {
  jwt: { accessSecret: 'a'.repeat(32), issuer: 'boxxed-api', audience: 'boxxed-app' },
} as AppConfig;

describe('JwtAccessStrategy.validate', () => {
  const strategy = new JwtAccessStrategy(config);

  it('maps valid claims to the caller', () => {
    expect(strategy.validate({ sub: 'u1', role: 'CUSTOMER', onb: 'CONSENT' })).toEqual({
      id: 'u1',
      role: 'CUSTOMER',
      onboardingStep: 'CONSENT',
    });
  });

  it.each([
    [{ role: 'CUSTOMER', onb: 'CONSENT' }],
    [{ sub: 'u1', role: 'ROOT', onb: 'CONSENT' }],
    [{ sub: 'u1', role: 'CUSTOMER', onb: 'DONE' }],
    // A refresh token's claims (were it ever signed with the access secret) are refused too.
    [{ sub: 'u1', fid: 'f', jti: 'j' }],
  ])('rejects %p', (claims) => {
    expect(strategy.validate(claims)).toBe(false);
  });
});
