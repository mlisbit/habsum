import { dayFromString } from '@habsum/types/common/day';
import { describe, expect, it } from 'vitest';
import type { HydratedHabitData } from '../../../../../types/habit.types.js';
import type { HabitDef } from '../../../../../types/userConfig.js';
import { SummationGraphBuilder } from './summation-graph-builder.js';

const viewingDate = dayFromString('2026-07-20');
const today = dayFromString('2026-07-23');

function getDefinition(period?: string): HabitDef<'summation'> {
  return {
    name: 'push ups',
    type: 'summation',
    repeat: [],
    insights: [],
    settings: { goal: 100 },
    ...(period ? { data_visualization: { bargraph: { period } } } : {}),
  };
}

function getHydratedHabit(): Extract<HydratedHabitData, { type: 'summation' }> {
  return {
    name: 'push ups',
    type: 'summation',
    dataStart: dayFromString('2026-07-17'),
    dataEnd: today,
    totals: [
      { date: viewingDate, total: 12 },
      { date: today, total: 5 },
    ],
    events: [],
  };
}

describe('SummationGraphBuilder.build', () => {
  it('returns BarGraphData directly', () => {
    const graphData = new SummationGraphBuilder(getHydratedHabit(), getDefinition('7d'), {
      viewingDate,
      today,
    }).build();

    expect(Object.keys(graphData ?? {})).toEqual([
      '2026-07-17',
      '2026-07-18',
      '2026-07-19',
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
    ]);
    expect(graphData?.[viewingDate]).toEqual({
      value: 12,
      top: 100,
      hoverLabel: expect.any(String),
      outline: true,
    });
    expect(graphData?.[dayFromString('2026-07-21')]).toEqual({
      value: null,
      top: 100,
      hoverLabel: expect.any(String),
      dimmed: true,
    });
    expect(graphData).not.toHaveProperty('data');
  });

  it('requires bar-graph configuration', () => {
    expect(() =>
      new SummationGraphBuilder(getHydratedHabit(), getDefinition(), {
        viewingDate,
        today,
      }).build(),
    ).toThrowError('bar graph configuration missing for "push ups"');
  });
});
