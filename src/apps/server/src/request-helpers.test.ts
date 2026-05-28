import { describe, expect, it } from 'vitest';
import { parseThemePatchInput } from './request-helpers.js';

describe('parseThemePatchInput', () => {
  it('maps nullish and system to DB null', () => {
    expect(parseThemePatchInput(null)).toBe(null);
    expect(parseThemePatchInput(undefined)).toBe(null);
    expect(parseThemePatchInput('')).toBe(null);
    expect(parseThemePatchInput('system')).toBe(null);
    expect(parseThemePatchInput('System')).toBe(null);
  });

  it('accepts light and dark', () => {
    expect(parseThemePatchInput('light')).toBe('light');
    expect(parseThemePatchInput('dark')).toBe('dark');
  });

  it('rejects unknown values', () => {
    expect(parseThemePatchInput('sepia')).toBe('invalid');
    expect(parseThemePatchInput(0)).toBe('invalid');
  });
});
