import type { BarGraphData } from '@habsum/types/common/bar-chart';
import { dayFromString } from '@habsum/types/common/day';
import type { StreakGraphData } from '@habsum/types/common/streak';
import { describe, expect, it } from 'vitest';
import { WidgetBuilder } from './widget-builder.js';

const graphData: BarGraphData = {
  '2026-07-20': {
    value: 4,
    top: 10,
    hoverLabel: 'Monday',
  },
  '2026-07-21': {
    value: null,
    top: 10,
    hoverLabel: 'Tuesday',
  },
  '2026-07-22': {
    value: 8,
    top: 10,
    hoverLabel: 'Wednesday',
    outline: true,
  },
};

describe('WidgetBuilder', () => {
  it('builds progress and history widgets through the fluent API', () => {
    const heatmap: StreakGraphData = { data: [] };

    const widgets = new WidgetBuilder()
      .withInsights({
        streakInsights: {
          currentStreak: 2,
          longestStreak: {
            start: dayFromString('2026-07-06'),
            end: dayFromString('2026-07-19'),
            values: ['done'],
          },
        },
        includeCurrentStreak: true,
        includeLongestStreak: true,
        includeWeeklyAverage: true,
        streakFrequency: '3d',
      })
      .withHeatmap(heatmap)
      .withBarGraph({ data: graphData, goal: 10 })
      .withProgress({ value: 8, goal: 10 })
      .build();

    expect(widgets).toHaveLength(2);
    expect(widgets[0]).toEqual({
      title: 'Goal',
      titleValue: '8 / 10',
      body: [{ kind: 'progress', value: 8, max: 10 }],
    });
    expect(widgets[1]?.body.map((body) => body.kind)).toEqual([
      'barGraph',
      'streakGraph',
      'insights',
    ]);
    expect(widgets[1]?.body[0]).toEqual({
      kind: 'barGraph',
      data: graphData,
      lines: [{ value: 10, label: 'Daily goal: 10' }],
    });
    expect(widgets[1]?.body[1]).toEqual({ kind: 'streakGraph', graph: heatmap });
    expect(widgets[1]?.body[2]).toEqual({
      kind: 'insights',
      insights: [
        {
          header: 'Current streak',
          description: '2 weeks',
        },
        {
          header: 'Longest streak',
          description: '2 weeks',
          hover: expect.stringMatching(/Includes 3\+ per week: done$/),
        },
        {
          header: 'Average/day',
          description: '6',
          hover: expect.any(String),
        },
      ],
    });
  });

  it('includes absent graph days in the average when requested', () => {
    const widgets = new WidgetBuilder()
      .withBarGraph({ data: graphData, goal: null })
      .withInsights({
        streakInsights: null,
        includeCurrentStreak: false,
        includeLongestStreak: false,
        includeWeeklyAverage: true,
        includeAbsentDaysInAverage: true,
      })
      .build();

    expect(widgets[0]?.body[1]).toEqual({
      kind: 'insights',
      insights: [
        {
          header: 'Average/day',
          description: '4',
          hover: expect.any(String),
        },
      ],
    });
  });

  it('omits an empty history widget and formats progress without a goal', () => {
    expect(new WidgetBuilder().build()).toEqual([]);
    expect(new WidgetBuilder().withProgress({ value: null, goal: null }).build()).toEqual([
      {
        title: 'Progress',
        titleValue: 'No data',
        body: [],
      },
    ]);
  });
});
