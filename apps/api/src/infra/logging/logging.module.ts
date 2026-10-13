import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { buildPinoHttpOptions } from './pino-options';
import { AppConfig } from '../../config/app-config.service';

/** JSON logs to stdout with a per-request id (docs/06 §9). */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({ pinoHttp: buildPinoHttpOptions(config.logLevel) }),
    }),
  ],
})
export class LoggingModule {}
