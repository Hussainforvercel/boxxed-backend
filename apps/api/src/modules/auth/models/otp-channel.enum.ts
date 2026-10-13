import { registerEnumType } from '@nestjs/graphql';

import { OtpChannel } from '../otp/otp.types';

registerEnumType(OtpChannel, { name: 'OtpChannel' });

export { OtpChannel };
