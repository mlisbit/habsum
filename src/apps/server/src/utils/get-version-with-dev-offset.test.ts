import { expect, it } from 'vitest';
import getVersionWithDevOffset from './get-version-with-dev-offset.js';

it.each([
  ['0.1.36', true, '0.1.37'],
  ['1.2.1', true, '1.2.2'],
  ['0.2.0', true, '0.2.1'],
  ['0.0.0', true, '0.0.1'],
  ['0.1.36', false, '0.1.36'],
  ['invalid', true, 'invalid'],
])('offsets GitHub version %s with enabled=%s', (version, enabled, expected) => {
  expect(getVersionWithDevOffset(version, enabled)).toBe(expected);
});
