import { Kind, parse } from 'graphql';

import { isIntrospectionOnly, operationDepth } from './query-depth';

import type { OperationDefinitionNode } from 'graphql';

function depthOf(query: string): number {
  const document = parse(query);
  const operation = document.definitions.find(
    (d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION,
  );
  if (!operation) throw new Error('no operation');
  return operationDepth(document, operation);
}

describe('operationDepth', () => {
  it('counts nested fields', () => {
    expect(depthOf('{ __typename }')).toBe(1);
    expect(depthOf('{ health { status } }')).toBe(2);
    expect(depthOf('{ a { b { c { d } } } }')).toBe(4);
  });

  it('follows named and inline fragments', () => {
    expect(depthOf('{ a { ...F } } fragment F on A { b { c } }')).toBe(3);
    expect(depthOf('{ a { ... on A { b } } }')).toBe(2);
  });

  it('does not loop on recursive fragments', () => {
    expect(depthOf('{ a { ...F } } fragment F on A { b { ...F } }')).toBe(2);
  });
});

describe('isIntrospectionOnly', () => {
  it('detects introspection-only operations', () => {
    const [op] = parse('{ __schema { types { name } } }').definitions as OperationDefinitionNode[];
    const [mixed] = parse('{ __typename health { status } }')
      .definitions as OperationDefinitionNode[];
    expect(op && isIntrospectionOnly(op)).toBe(true);
    expect(mixed && isIntrospectionOnly(mixed)).toBe(false);
  });
});
