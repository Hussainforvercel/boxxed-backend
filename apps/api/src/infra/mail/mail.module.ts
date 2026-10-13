import { Global, Module } from '@nestjs/common';
import { createTransport } from 'nodemailer';

import { MAIL_TRANSPORT } from './mail.constants';
import { MailService } from './mail.service';
import { AppConfig } from '../../config/app-config.service';

import type { Transporter } from 'nodemailer';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [AppConfig],
      useFactory: (config: AppConfig): Transporter => {
        const { host, port, secure, user, pass } = config.smtp;
        return createTransport({
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          host,
          port,
          secure,
          ...(user && pass ? { auth: { user, pass } } : {}),
          // Staging/prod relays must present a valid certificate.
          requireTLS: config.appEnv !== 'local' && !secure,
          logger: false,
          debug: false,
        });
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
