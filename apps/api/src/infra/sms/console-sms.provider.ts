import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../config/app-config.service';

import type { SmsProvider } from './sms-provider';

/**
 * Development SMS provider. Production refuses to boot with it (validate-env).
 * - APP_ENV=local: prints the message (with the code) to the terminal, outside the structured
 *   logger, so a developer can sign in. Nothing reaches log shipping.
 * - Anywhere else: records only that a message was suppressed, with no destination and no text.
 *   Staging phone sign-in uses the OTP_TEST_* allow-list until a vendor exists.
 */
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  constructor(private readonly config: AppConfig) {}

  async send(e164: string, text: string): Promise<void> {
    if (this.config.appEnv === 'local') {
      process.stdout.write(`\n[dev sms] to ${e164}: ${text}\n\n`);
      return;
    }
    this.logger.warn('SMS suppressed: console provider does not deliver outside local');
  }
}
