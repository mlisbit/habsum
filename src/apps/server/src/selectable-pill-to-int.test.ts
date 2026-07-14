import { describe, expect, it } from 'vitest';
import { selectablePillToInt } from './selectable-pill-to-int.js';

const selectableValues = ['none', 'light', 'moderate', 'heavy'];

describe('selectablePillToInt', () => {
  it('maps every value to its one-based position when streak values are not defined', () => {
    expect(selectablePillToInt(selectableValues)).toEqual(
      new Map([
        ['none', 1],
        ['light', 2],
        ['moderate', 3],
        ['heavy', 4],
      ]),
    );
  });

  it('makes only configured streak values positive', () => {
    expect(selectablePillToInt(selectableValues, ['none', 'light'])).toEqual(
      new Map([
        ['none', 2],
        ['light', 1],
        ['moderate', -3],
        ['heavy', -4],
      ]),
    );
  });

  it('treats an empty streak value list as not configured', () => {
    expect(selectablePillToInt(selectableValues, [])).toEqual(
      new Map([
        ['none', 1],
        ['light', 2],
        ['moderate', 3],
        ['heavy', 4],
      ]),
    );
  });
});
