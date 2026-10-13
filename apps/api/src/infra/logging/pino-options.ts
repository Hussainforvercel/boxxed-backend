import { randomUUID } from 'node:crypto';

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Options } from 'pino-http';

const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

/** Secrets and PII never reach the logs (docs/06 §9). Paths use pino redact syntax. */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.refreshToken',
  '*.accessToken',
  '*.idToken',
  '*.code',
  '*.destination',
  '*.phoneE164',
  '*.email',
];

export function buildPinoHttpOptions(level: string): Options {
  return {
    level,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const incoming = req.headers[REQUEST_ID_HEADER];
      const id =
        typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
    // Probes are polled constantly; logging them is noise.
    autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
    // Never log bodies (GraphQL variables can hold codes and contact details).
    serializers: {
      req: (req: { id: unknown; method: unknown; url: unknown }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
    },
  };
}
