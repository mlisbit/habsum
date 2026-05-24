import { describe, expect, it } from 'vitest';
import { classBuilder } from '~/utils/class-builder';

describe('classBuilder', () => {
  it('applies base classes and active entries from the map', () => {
    expect(
      classBuilder(
        { 'full-class-name--blah': true },
        'base-class-name-thats-applied-to-everything',
      ),
    ).toBe('base-class-name-thats-applied-to-everything full-class-name--blah');
  });

  it('omits inactive map entries', () => {
    expect(
      classBuilder(
        {
          'settings__link--active': false,
          'text-error': true,
        },
        'settings__link text-b-l',
      ),
    ).toBe('settings__link text-b-l text-error');
  });

  it('supports multiple base classes in one string', () => {
    expect(classBuilder({}, 'foo bar baz')).toBe('foo bar baz');
  });
});
