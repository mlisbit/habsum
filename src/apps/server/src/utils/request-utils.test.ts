import { describe, expect, it } from 'vitest';
import { getThemePatchInput } from './request-utils.js';

describe('getThemePatchInput', () => {
  it('maps nullish and system to DB null', () => {
    expect(getThemePatchInput(null)).toBe(null);
    expect(getThemePatchInput(undefined)).toBe(null);
    expect(getThemePatchInput('')).toBe(null);
    expect(getThemePatchInput('system')).toBe(null);
    expect(getThemePatchInput('System')).toBe(null);
  });

  it('accepts light and dark', () => {
    expect(getThemePatchInput('light')).toBe('light');
    expect(getThemePatchInput('dark')).toBe('dark');
  });

  it('rejects unknown values', () => {
    expect(getThemePatchInput('sepia')).toBe('invalid');
    expect(getThemePatchInput(0)).toBe('invalid');
  });
});
