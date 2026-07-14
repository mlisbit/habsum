import { describe, expect, it } from 'vitest';
import { fillDistribution } from './fill-distribution.js';

describe('fillDistribution', () => {
  it('normalizes positive values against the largest value', () => {
    expect(fillDistribution([1, 2, 3, 50, 100])).toEqual([1, 1, 1, 3, 5]);
  });

  it('normalizes negative values independently from positive values', () => {
    expect(fillDistribution([-100, -50, -3, 50, 100])).toEqual([-5, -3, -1, 3, 5]);
  });

  it('preserves zero and undefined values', () => {
    expect(fillDistribution([undefined, 0, undefined])).toEqual([undefined, 0, undefined]);
  });
});
