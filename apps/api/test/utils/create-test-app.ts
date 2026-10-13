import { Test } from '@nestjs/testing';

import type { TestFakes } from './fakes';
import type { INestApplication, Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

export interface TestAppOptions {
  /** Replace SMS, mail and Google verification with capturing fakes. */
  fakes?: TestFakes;
  /** Extra modules (e.g. a test-only resolver). */
  imports?: Type[];
}

/**
 * Boots the real AppModule against real Postgres + Redis. `env` overrides are applied before
 * the module is loaded, because ConfigModule validates the environment at import time.
 */
export async function createTestApp(
  env: Record<string, string> = {},
  options: TestAppOptions = {},
): Promise<INestApplication> {
  Object.assign(process.env, env);
  const { AppModule } = await import('../../src/app.module');
  const { configureApp } = await import('../../src/bootstrap');
  const { MailService } = await import('../../src/infra/mail/mail.service');
  const { SMS_PROVIDER } = await import('../../src/infra/sms/sms-provider');
  const { GoogleIdTokenVerifier } =
    await import('../../src/modules/auth/strategies/google-id-token.verifier');

  let builder = Test.createTestingModule({ imports: [AppModule, ...(options.imports ?? [])] });
  if (options.fakes) {
    builder = builder
      .overrideProvider(MailService)
      .useValue(options.fakes.mail)
      .overrideProvider(SMS_PROVIDER)
      .useValue(options.fakes.sms)
      .overrideProvider(GoogleIdTokenVerifier)
      .useValue(options.fakes.google);
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  // Listen once: otherwise supertest listens and closes the same server around every request,
  // and a close still in flight can kill the next request ("socket hang up").
  await app.listen(0, '127.0.0.1');
  return app;
}
