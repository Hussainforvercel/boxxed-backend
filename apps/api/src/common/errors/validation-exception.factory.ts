import { ErrorCode } from '@boxxed/shared';

import { DomainError } from './domain-error';

import type { ValidationError } from 'class-validator';

/** ValidationPipe → BAD_USER_INPUT with `extensions.fields: { [path]: string[] }`. */
export function validationExceptionFactory(errors: ValidationError[]): DomainError {
  return new DomainError(ErrorCode.BAD_USER_INPUT, 'Invalid input', {
    fields: flatten(errors),
  });
}

function flatten(errors: ValidationError[], parent = ''): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints) fields[path] = Object.values(error.constraints);
    Object.assign(fields, flatten(error.children ?? [], path));
  }
  return fields;
}
