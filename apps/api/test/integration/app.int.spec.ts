import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { GraphQLSchemaHost } from '@nestjs/graphql';
import request from 'supertest';

import { printSchema } from '../../src/graphql/print-schema';
import { createTestApp } from '../utils/create-test-app';
import { gql } from '../utils/graphql';

import type { INestApplication } from '@nestjs/common';

describe('API foundation (real Postgres + Redis)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health is live', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
  });

  it('GET /health/ready reports db and redis ok', async () => {
    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200, { status: 'ok', db: 'ok', redis: 'ok' });
  });

  it('answers a GraphQL __typename query', async () => {
    expect(await gql(app, '{ __typename }')).toEqual({ data: { __typename: 'Query' } });
  });

  it('answers the health query', async () => {
    const body = await gql(app, '{ health { status db redis } }');
    expect(body).toEqual({ data: { health: { status: 'OK', db: 'OK', redis: 'OK' } } });
  });

  it('maps invalid operations to BAD_USER_INPUT without stack traces', async () => {
    const body = await gql(app, '{ doesNotExist }');
    const extensions = body.errors?.[0]?.extensions ?? {};
    expect(extensions['code']).toBe('BAD_USER_INPUT');
    expect(typeof extensions['requestId']).toBe('string');
    expect(Object.keys(extensions).sort()).toEqual(['code', 'requestId']);
  });

  it('serves the same schema that is committed in packages/shared', () => {
    const committed = readFileSync(
      resolve(__dirname, '../../../../packages/shared/schema.graphql'),
      'utf8',
    );
    expect(printSchema(app.get(GraphQLSchemaHost).schema)).toBe(committed);
  });
});
