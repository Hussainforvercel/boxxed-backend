import './instrument';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const config = configureApp(app);
  await app.listen(config.port);
}

bootstrap().catch((error: unknown) => {
  // Config validation and other boot failures end here: print and exit non-zero.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
