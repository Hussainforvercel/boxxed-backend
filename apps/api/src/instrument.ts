import * as Sentry from '@sentry/nestjs';

// Must be imported before anything else in main.ts. Runs before Nest (and AppConfig) exist,
// which is why it reads process.env directly. Disabled when SENTRY_DSN is unset.
const dsn = process.env['SENTRY_DSN'];

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env['APP_ENV'] ?? 'local',
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}
