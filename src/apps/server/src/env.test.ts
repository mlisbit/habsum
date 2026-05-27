import { describe, expect, it } from 'vitest';
import { isDevelopment } from './env.js';

describe('isDevelopment', () => {
  it('is false in production and test', () => {
    expect(isDevelopment()).toBe(false);
  });
});
