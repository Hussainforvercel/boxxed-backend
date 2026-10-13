import { isEmail, ValidateBy } from 'class-validator';

import { isPhoneE164 } from '../../../common/validation/is-phone-e164';
import { normalizeEmail, normalizePhone } from '../../../common/validation/transforms';
import { OtpChannel } from '../otp/otp.types';

import type { ValidationOptions } from 'class-validator';

const MAX_EMAIL_LENGTH = 254;

/** class-transformer hook: lowercases an email or parses a phone to E.164, by `channel`. */
export const normalizeDestination = ({
  value,
  obj,
}: {
  value: unknown;
  obj: { channel?: unknown };
}): unknown => {
  if (typeof value !== 'string') return value;
  return obj.channel === OtpChannel.PHONE ? normalizePhone(value) : normalizeEmail(value);
};

/** An email for channel EMAIL, an E.164 phone for channel PHONE. */
export function IsOtpDestination(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isOtpDestination',
      validator: {
        validate: (value, args) => {
          const channel = (args?.object as { channel?: unknown } | undefined)?.channel;
          if (typeof value !== 'string') return false;
          if (channel === OtpChannel.EMAIL) {
            return value.length <= MAX_EMAIL_LENGTH && isEmail(value);
          }
          return channel === OtpChannel.PHONE && isPhoneE164(value);
        },
        defaultMessage: (args) =>
          (args?.object as { channel?: unknown } | undefined)?.channel === OtpChannel.PHONE
            ? 'must be a valid phone number in international format'
            : 'must be a valid email address',
      },
    },
    options,
  );
}
