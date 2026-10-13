import { Kind } from 'graphql';

import type {
  DocumentNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  SelectionSetNode,
} from 'graphql';

/** Returns true when the operation only asks for introspection (`__schema`, `__type`, …). */
export function isIntrospectionOnly(operation: OperationDefinitionNode): boolean {
  return operation.selectionSet.selections.every(
    (selection) => selection.kind === Kind.FIELD && selection.name.value.startsWith('__'),
  );
}

/** Field nesting depth of an operation, following fragments. `{ a { b } }` has depth 2. */
export function operationDepth(document: DocumentNode, operation: OperationDefinitionNode): number {
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION)
      fragments.set(definition.name.value, definition);
  }
  return selectionDepth(operation.selectionSet, fragments, new Set());
}

function selectionDepth(
  selectionSet: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
  visiting: Set<string>,
): number {
  let max = 0;
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const child = selection.selectionSet
        ? selectionDepth(selection.selectionSet, fragments, visiting)
        : 0;
      max = Math.max(max, 1 + child);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      max = Math.max(max, selectionDepth(selection.selectionSet, fragments, visiting));
    } else {
      const name = selection.name.value;
      const fragment = fragments.get(name);
      if (!fragment || visiting.has(name)) continue;
      visiting.add(name);
      max = Math.max(max, selectionDepth(fragment.selectionSet, fragments, visiting));
      visiting.delete(name);
    }
  }
  return max;
}
