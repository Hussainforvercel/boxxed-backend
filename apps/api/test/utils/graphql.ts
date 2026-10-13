import request from 'supertest';

import type { INestApplication } from '@nestjs/common';

export interface GraphQLError {
  message: string;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponseBody<TData = Record<string, unknown>> {
  data?: TData | null;
  errors?: GraphQLError[];
}

export interface GqlOptions {
  variables?: Record<string, unknown>;
  /** Access token sent as `Authorization: Bearer …`. */
  token?: string;
  /** Client IP via X-Forwarded-For (needs TRUST_PROXY_HOPS=1). */
  ip?: string;
}

export async function gql<TData = Record<string, unknown>>(
  app: INestApplication,
  query: string,
  options: GqlOptions = {},
): Promise<GraphQLResponseBody<TData>> {
  let call = request(app.getHttpServer()).post('/graphql').set('content-type', 'application/json');
  if (options.token) call = call.set('authorization', `Bearer ${options.token}`);
  if (options.ip) call = call.set('x-forwarded-for', options.ip);
  const response = await call.send({ query, variables: options.variables ?? {} });
  return response.body as GraphQLResponseBody<TData>;
}

/** The first error's extensions, or a failure naming what came back instead. */
export function errorOf(body: GraphQLResponseBody<unknown>): Record<string, unknown> {
  const error = body.errors?.[0];
  if (!error) throw new Error(`expected an error, got ${JSON.stringify(body.data)}`);
  return error.extensions ?? {};
}
