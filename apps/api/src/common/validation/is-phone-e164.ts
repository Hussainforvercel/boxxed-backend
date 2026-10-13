import { ValidateBy } from 'class-validator';
import { isValidPhoneNumber } from 'libphonenumber-js';

import type { ValidationOptions } from 'class-validator';

const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

export function isPhoneE164(value: unknown): boolean {
  return typeof value === 'string' && E164_PATTERN.test(value) && isValidPhoneNumber(value);
}

/** A valid phone number already normalized to E.164 (pair with `normalizePhone`). */
export function IsPhoneE164(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isPhoneE164',
      validator: {
        validate: isPhoneE164,
        defaultMessage: () => 'must be a valid phone number in international format',
      },
    },
    options,
  );
}
