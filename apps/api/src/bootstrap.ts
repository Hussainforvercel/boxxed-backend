import { AppConfig } from './config/app-config.service';

import type { NestExpressApplication } from '@nestjs/platform-express';

/** HTTP-level setup shared by main.ts and the integration tests. */
export function configureApp(app: NestExpressApplication): AppConfig {
  const config = app.get(AppConfig);
  app.set('trust proxy', config.trustProxyHops);
  app.enableCors({ origin: config.corsOrigins === '*' ? true : config.corsOrigins });
  app.enableShutdownHooks();
  return config;
}
