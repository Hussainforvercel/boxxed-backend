import { Inject, Injectable, Logger } from '@nestjs/common';

import { MAIL_TRANSPORT } from './mail.constants';
import { AppConfig } from '../../config/app-config.service';

import type { OnApplicationShutdown } from '@nestjs/common';
import type { Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Retries after the first attempt, for transient failures only (docs/06 §11). */
export const MAIL_MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 250;

/** Connection-level failures that are worth retrying (nodemailer / node error codes). */
const TRANSIENT_ERROR_CODES = new Set([
  'ECONNECTION',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ESOCKET',
  'EDNS',
]);

export function isTransientMailError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { responseCode, code } = error as { responseCode?: unknown; code?: unknown };
  // SMTP 4xx = temporary (try again later); 5xx = permanent, never retried.
  if (typeof responseCode === 'number') return responseCode >= 400 && responseCode < 500;
  return typeof code === 'string' && TRANSIENT_ERROR_CODES.has(code);
}

/**
 * Sends mail through one pooled transport (created once, closed on shutdown). Never logs the
 * recipient or the body: both can hold PII or an OTP.
 */
@Injectable()
export class MailService implements OnApplicationShutdown {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: Transporter,
    private readonly config: AppConfig,
  ) {}

  async send(message: MailMessage): Promise<void> {
    const from = this.config.smtp.from;
    for (let attempt = 0; ; attempt += 1) {
      try {
        await this.transport.sendMail({ from, ...message });
        return;
      } catch (error) {
        if (attempt >= MAIL_MAX_RETRIES || !isTransientMailError(error)) {
          this.logger.error({ msg: 'mail send failed', attempt, reason: describe(error) });
          throw new Error('Mail delivery failed');
        }
        this.logger.warn({ msg: 'mail send retry', attempt, reason: describe(error) });
        await this.sleep(BASE_BACKOFF_MS * 2 ** attempt);
      }
    }
  }

  /** Overridable so tests don't wait for real backoff. */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  onApplicationShutdown(): void {
    this.transport.close();
  }
}

/** Error code / SMTP status only: messages can echo the recipient address. */
function describe(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'unknown';
  const { responseCode, code } = error as { responseCode?: unknown; code?: unknown };
  return [code, responseCode].filter((part) => part !== undefined).join(' ') || 'unknown';
}
