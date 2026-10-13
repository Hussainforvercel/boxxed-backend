import { Plugin } from '@nestjs/apollo';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { fieldExtensionsEstimator, getComplexity, simpleEstimator } from 'graphql-query-complexity';

import { ErrorCode } from '@boxxed/shared';

import { isIntrospectionOnly, operationDepth } from './query-depth';
import { AppConfig } from '../../config/app-config.service';

import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';

/** Rejects operations above the configured cost or depth (docs/09 §Query cost). */
@Plugin()
export class ComplexityPlugin implements ApolloServerPlugin {
  constructor(
    private readonly schemaHost: GraphQLSchemaHost,
    private readonly config: AppConfig,
  ) {}

  async requestDidStart(): Promise<GraphQLRequestListener<object>> {
    const { schema } = this.schemaHost;
    const maxComplexity = this.config.graphqlMaxComplexity;
    const maxDepth = this.config.graphqlMaxDepth;

    return {
      didResolveOperation: async ({ request, document, operation }) => {
        // Apollo reports unresolvable operations itself (OPERATION_RESOLUTION_FAILURE).
        if (!operation || isIntrospectionOnly(operation)) return;

        const depth = operationDepth(document, operation);
        if (depth > maxDepth) reject(`Query depth ${depth} exceeds the maximum of ${maxDepth}`);

        const complexity = getComplexity({
          schema,
          query: document,
          ...(request.operationName ? { operationName: request.operationName } : {}),
          variables: request.variables ?? {},
          estimators: [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })],
        });
        if (complexity > maxComplexity) {
          reject(`Query complexity ${complexity} exceeds the maximum of ${maxComplexity}`);
        }
      },
    };
  }
}

function reject(message: string): never {
  throw new GraphQLError(message, { extensions: { code: ErrorCode.BAD_USER_INPUT } });
}
