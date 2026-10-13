import type { CodegenConfig } from '@graphql-codegen/cli';

// Schema-level types only (enums, object types, scalars). Operation types live in apps/mobile.
const config: CodegenConfig = {
  schema: './schema.graphql',
  generates: {
    './src/generated/graphql.ts': {
      plugins: ['typescript'],
      config: {
        enumsAsTypes: true,
        scalars: { DateTime: 'string' },
        avoidOptionals: { field: true, inputValue: false },
      },
    },
  },
};

export default config;
