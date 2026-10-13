import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { formatError } from '../common/errors/format-error';
import { ComplexityPlugin } from '../common/plugins/complexity.plugin';
import { OperationLoggingPlugin } from '../common/plugins/operation-logging.plugin';
import { AppConfig } from '../config/app-config.service';

import type { ApolloDriverConfig } from '@nestjs/apollo';

/** Code-first GraphQL on Apollo Server 5 (express5). docs/06 §2. */
@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [AppConfig],
      useFactory: (config: AppConfig): ApolloDriverConfig => ({
        // In-memory schema: packages/shared/schema.graphql is written only by `schema:emit`.
        autoSchemaFile: true,
        sortSchema: true,
        path: '/graphql',
        playground: false,
        introspection: !config.isProduction,
        csrfPrevention: true,
        includeStacktraceInErrorResponses: false,
        plugins: config.isProduction ? [ApolloServerPluginLandingPageDisabled()] : [],
        formatError,
        context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
      }),
    }),
  ],
  providers: [ComplexityPlugin, OperationLoggingPlugin],
})
export class AppGraphQLModule {}
