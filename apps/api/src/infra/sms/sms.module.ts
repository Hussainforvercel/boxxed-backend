import { Global, Module } from '@nestjs/common';

import { ConsoleSmsProvider } from './console-sms.provider';
import { SMS_PROVIDER } from './sms-provider';
import { AppConfig } from '../../config/app-config.service';

import type { SmsProvider } from './sms-provider';

@Global()
@Module({
  providers: [
    ConsoleSmsProvider,
    {
      provide: SMS_PROVIDER,
      inject: [AppConfig, ConsoleSmsProvider],
      useFactory: (config: AppConfig, consoleProvider: ConsoleSmsProvider): SmsProvider => {
        switch (config.smsProvider) {
          case 'console':
            return consoleProvider;
        }
      },
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
