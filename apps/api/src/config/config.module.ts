import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfig } from './app-config.service';
import { validateEnv } from './validate-env';

@Global()
@Module({
  imports: [
    // skipProcessEnv: read only validated, typed values. Otherwise an empty `FOO=` (treated as
    // unset by validateEnv) would fall back to the raw '' from process.env.
    ConfigModule.forRoot({ cache: true, validate: validateEnv, skipProcessEnv: true }),
  ],
  providers: [AppConfig],
  exports: [AppConfig],
})
export class AppConfigModule {}
