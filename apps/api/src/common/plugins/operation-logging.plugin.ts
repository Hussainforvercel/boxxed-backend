import { Plugin } from '@nestjs/apollo';
import { Logger } from '@nestjs/common';

import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';

interface RequestContext {
  req?: { id?: unknown };
}

/**
 * One log line per operation (name, duration, error codes; never variables) and the request id
 * on every error, so a client report can be matched to the logs (docs/06 §8–9).
 */
@Plugin()
export class OperationLoggingPlugin implements ApolloServerPlugin<RequestContext> {
  private readonly logger = new Logger('GraphQL');

  async requestDidStart(): Promise<GraphQLRequestListener<RequestContext>> {
    const startedAt = performance.now();
    const logger = this.logger;

    return {
      async willSendResponse({ request, response, contextValue }) {
        const requestId = contextValue.req?.id;
        const body = response.body;
        const errors = body.kind === 'single' ? (body.singleResult.errors ?? []) : [];

        if (typeof requestId === 'string' && body.kind === 'single' && errors.length > 0) {
          body.singleResult.errors = errors.map((error) => ({
            ...error,
            extensions: { ...error.extensions, requestId },
          }));
        }

        logger.log({
          msg: 'graphql operation',
          operationName: request.operationName ?? null,
          durationMs: Math.round(performance.now() - startedAt),
          errorCodes: errors.map((error) => error.extensions?.['code'] ?? null),
        });
      },
    };
  }
}
