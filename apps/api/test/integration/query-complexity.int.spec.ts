import { createTestApp } from '../utils/create-test-app';
import { gql } from '../utils/graphql';

import type { INestApplication } from '@nestjs/common';

describe('query complexity limit', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ GRAPHQL_MAX_DEPTH: '8', GRAPHQL_MAX_COMPLEXITY: '3' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects operations above GRAPHQL_MAX_COMPLEXITY', async () => {
    const body = await gql(app, '{ health { status db redis } }');
    expect(body.errors?.[0]).toMatchObject({
      message: 'Query complexity 4 exceeds the maximum of 3',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});
