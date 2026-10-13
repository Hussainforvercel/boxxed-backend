import { createTestApp } from '../utils/create-test-app';
import { gql } from '../utils/graphql';

import type { INestApplication } from '@nestjs/common';

describe('query depth limit', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ GRAPHQL_MAX_DEPTH: '1' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows operations within both limits', async () => {
    expect(await gql(app, '{ __typename }')).toEqual({ data: { __typename: 'Query' } });
  });

  it('rejects operations deeper than GRAPHQL_MAX_DEPTH', async () => {
    const body = await gql(app, '{ health { status } }');
    expect(body.errors?.[0]).toMatchObject({
      message: 'Query depth 2 exceeds the maximum of 1',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});
