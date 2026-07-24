import { describe, expect, it } from 'vitest';
import isDevelopment from './is-development.js';

describe('isDevelopment', () => {
  it('is false in production and test', () => {
    expect(isDevelopment()).toBe(false);
  });
});
