import { deriveStep } from './onboarding.service';

describe('deriveStep (DEC-3: name + current terms; never a phone)', () => {
  it.each([
    [null, false, 'PROFILE'],
    [null, true, 'PROFILE'],
    ['Ali Raza', false, 'CONSENT'],
    ['Ali Raza', true, 'COMPLETE'],
  ] as const)('fullName=%p, consents=%p → %s', (fullName, requiredConsentsGranted, step) => {
    expect(deriveStep({ fullName, requiredConsentsGranted })).toBe(step);
  });

  it('has no phone input at all', () => {
    // The facts type is the contract: adding a phone requirement would be a visible change.
    const facts: Parameters<typeof deriveStep>[0] = {
      fullName: 'A B',
      requiredConsentsGranted: true,
    };
    expect(Object.keys(facts).sort()).toEqual(['fullName', 'requiredConsentsGranted']);
  });
});
