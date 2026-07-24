import type { HabitHistory } from '@habsum/types/common/habit';
import { describe, expect, it } from 'vitest';
import { historyWidget, progressWidget } from './widget-utils.js';

const oneWeekHistory: HabitHistory = {
  data: {
    user: {
      graphData: {
        '2025-05-15': { value: null, top: 5, hoverLabel: 'Thu' },
        '2025-05-16': { value: 2, top: 5, hoverLabel: 'Fri' },
        '2025-05-17': { value: null, top: 5, hoverLabel: 'Sat' },
        '2025-05-18': { value: 4, top: 5, hoverLabel: 'Sun' },
        '2025-05-19': { value: null, top: 5, hoverLabel: 'Mon' },
        '2025-05-20': { value: null, top: 5, hoverLabel: 'Tue' },
        '2025-05-21': { value: null, top: 5, hoverLabel: 'Wed' },
      },
    },
  },
};

describe('historyWidget', () => {
  it('shows average per day for the graph window and explains missing days', () => {
    const widget = historyWidget(oneWeekHistory, 5);

    expect(widget.titleValue).toBeUndefined();
    expect(widget.body[0]).toMatchObject({
      kind: 'barGraph',
      lines: [{ value: 5, label: 'Daily goal: 5' }],
    });
    expect(widget.body[1]).toEqual({
      kind: 'insights',
      insights: [
        {
          header: 'Average/day',
          description: '3',
          hover: 'May 15 to today',
        },
      ],
    });
  });

  it('includes missing days as zero when configured', () => {
    const widget = historyWidget(oneWeekHistory, 5, true);

    expect(widget.titleValue).toBeUndefined();
    expect(widget.body[0]).toMatchObject({
      kind: 'barGraph',
      lines: [{ value: 5, label: 'Daily goal: 5' }],
    });
    expect(widget.body[1]).toEqual({
      kind: 'insights',
      insights: [
        {
          header: 'Average/day',
          description: '1',
          hover: 'May 15 to today',
        },
      ],
    });
  });

  it('uses the configured current graph period in the average card', () => {
    const graphData = Object.fromEntries(
      Array.from({ length: 21 }, (_, index) => [
        `2025-05-${String(index + 1).padStart(2, '0')}`,
        { value: 0, top: 5, hoverLabel: String(index + 1) },
      ]),
    );
    const widget = historyWidget({ data: { user: { graphData } } }, 5, true);

    expect(widget.body[1]).toEqual({
      kind: 'insights',
      insights: [
        {
          header: 'Average/day',
          description: '0',
          hover: 'May 1 to today',
        },
      ],
    });
  });

  it('labels average range through the outlined view date for past windows', () => {
    const graphData = {
      ...oneWeekHistory.data.user.graphData,
      '2025-05-18': { value: 4, top: 5, hoverLabel: 'Sun', outline: true },
      '2025-05-19': { value: null, top: 5, hoverLabel: 'Mon', dimmed: true },
      '2025-05-20': { value: null, top: 5, hoverLabel: 'Tue', dimmed: true },
      '2025-05-21': { value: null, top: 5, hoverLabel: 'Wed', dimmed: true },
    };
    const widget = historyWidget({ data: { user: { graphData } } }, 5);

    expect(widget.titleValue).toBeUndefined();
    expect(widget.body[1]).toEqual({
      kind: 'insights',
      insights: [
        {
          header: 'Average/day',
          description: '3',
          hover: 'May 15 to May 18',
        },
      ],
    });
  });
});

describe('progressWidget', () => {
  it('labels summation goals with compact current over goal text', () => {
    expect(progressWidget(2, 5)).toMatchObject({
      title: 'Goal',
      titleValue: '2 / 5',
    });
  });

  it('labels goal-less summation totals as progress', () => {
    expect(progressWidget(null, null)).toEqual({
      title: 'Progress',
      titleValue: 'No data',
      body: [],
    });
    expect(progressWidget(0, null)).toMatchObject({
      title: 'Progress',
      titleValue: '0',
    });
    expect(progressWidget(4, null)).toMatchObject({
      title: 'Progress',
      titleValue: '4',
    });
  });
});
