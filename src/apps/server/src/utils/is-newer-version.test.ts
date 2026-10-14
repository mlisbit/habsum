import { describe, expect, it } from 'vitest';
import isNewerVersion from './is-newer-version.js';

describe('isNewerVersion', () => {
  it.each([
    ['0.10.0', '0.9.9', true],
    ['1.0.0', '0.99.99', true],
    ['0.1.37', '0.1.36', true],
    ['0.1.36', '0.1.36', false],
    ['0.1.9', '0.1.36', false],
    ['0.9.0', '0.10.0', false],
    ['invalid', '0.1.36', false],
  ])('compares %s against %s', (candidate, current, expected) => {
    expect(isNewerVersion(candidate, current)).toBe(expected);
  });
});
