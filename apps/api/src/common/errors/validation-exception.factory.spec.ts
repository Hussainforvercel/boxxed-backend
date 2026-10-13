import { ValidationError } from 'class-validator';

import { validationExceptionFactory } from './validation-exception.factory';

describe('validationExceptionFactory', () => {
  it('produces BAD_USER_INPUT with flattened field paths', () => {
    const child = Object.assign(new ValidationError(), {
      property: 'email',
      constraints: { isEmail: 'email must be an email' },
      children: [],
    });
    const parent = Object.assign(new ValidationError(), { property: 'input', children: [child] });

    const error = validationExceptionFactory([parent]);

    expect(error.code).toBe('BAD_USER_INPUT');
    expect(error.extensions).toEqual({ fields: { 'input.email': ['email must be an email'] } });
  });
});
