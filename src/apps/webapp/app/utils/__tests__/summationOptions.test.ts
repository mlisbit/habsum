import { describe, expect, it } from 'vitest';
import { SUMMATION_OPTION_INPUT, parseSummationOptionsFromRaw } from '@habsum/types/common/habit';
import { formatIncrementLabel } from '../summationOptions';

describe('parseSummationOptionsFromRaw', () => {
  it('maps yaml arrays to manualInput + increments without sign conversion', () => {
    expect(parseSummationOptionsFromRaw([10])).toEqual({
      manualInput: true,
      increments: [10],
    });
    expect(parseSummationOptionsFromRaw([1, 10])).toEqual({
      manualInput: true,
      increments: [1, 10],
    });
    expect(parseSummationOptionsFromRaw([1, SUMMATION_OPTION_INPUT, 10])).toEqual({
      manualInput: true,
      increments: [1, 10],
    });
    expect(parseSummationOptionsFromRaw([1, SUMMATION_OPTION_INPUT, 5, 10])).toEqual({
      manualInput: true,
      increments: [1, 5, 10],
    });
    expect(parseSummationOptionsFromRaw([-1, SUMMATION_OPTION_INPUT, 5, 10])).toEqual({
      manualInput: true,
      increments: [-1, 5, 10],
    });
  });

  it('passes through API object shape', () => {
    expect(parseSummationOptionsFromRaw({ manualInput: true, increments: [1, 5, 10] })).toEqual({
      manualInput: true,
      increments: [1, 5, 10],
    });
  });

  it('converts legacy object to numeric increments', () => {
    expect(parseSummationOptionsFromRaw({ sub: 1, add: 2 })).toEqual({
      manualInput: true,
      increments: [1, 2],
    });
  });
});

describe('formatIncrementLabel', () => {
  it('formats signed deltas', () => {
    expect(formatIncrementLabel(-1)).toBe('-1');
    expect(formatIncrementLabel(5)).toBe('+5');
  });
});
