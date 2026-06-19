import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BarGraph, graphScaleTop } from '@habsum/ui/components/graphs/BarGraph';

afterEach(() => {
  cleanup();
});

describe('graphScaleTop', () => {
  it('uses the max of logged values and API datum tops', () => {
    expect(graphScaleTop([4], [5])).toBe(5);
    expect(graphScaleTop([100, 175], [100, 175])).toBe(175);
  });
});

describe('BarGraph reference lines', () => {
  const goalLine = [{ value: 100, label: 'your set goal 100' }];

  it('scales bars to API top when the goal exceeds logged totals', () => {
    const { container } = render(
      <BarGraph
        data={{
          '2026-05-21': { value: 4, top: 5, hoverLabel: 'Wed' },
        }}
        lines={[{ value: 5, label: 'your set goal 5' }]}
      />,
    );

    const fill = container.querySelector('.bar-graph__fill') as HTMLElement;
    expect(fill.style.height).toBe('80%');
    expect(container.querySelector('.bar-graph__line')).toBeNull();
  });

  it('renders a reference line at the same height as a matching bar', () => {
    const { container } = render(
      <BarGraph
        data={{
          '2026-05-20': { value: 40, top: 175, hoverLabel: 'Tue' },
          '2026-05-21': { value: 175, top: 175, hoverLabel: 'Wed' },
        }}
        lines={goalLine}
      />,
    );

    const marker = container.querySelector('.bar-graph__line') as HTMLElement;
    expect(marker).not.toBeNull();
    expect(marker.style.height).toBe(`${(100 / 175) * 100}%`);
    expect(container.querySelector('.bar-graph__line-dot')).not.toBeNull();
  });

  it('aligns the reference line with a 100 bar when older days have stale tops', () => {
    const { container } = render(
      <BarGraph
        data={{
          '2026-05-20': { value: 100, top: 100, hoverLabel: 'Tue' },
          '2026-05-21': { value: 175, top: 175, hoverLabel: 'Wed' },
        }}
        lines={goalLine}
      />,
    );

    const marker = container.querySelector('.bar-graph__line') as HTMLElement;
    const expected = `${(100 / 175) * 100}%`;
    expect(marker.style.height).toBe(expected);

    const fills = container.querySelectorAll('.bar-graph__fill');
    expect((fills[0] as HTMLElement).style.height).toBe(expected);
    expect((fills[1] as HTMLElement).style.height).toBe('100%');
  });

  it('hides the reference line when no bar exceeds the goal', () => {
    const { container } = render(
      <BarGraph
        data={{
          '2026-05-20': { value: 40, top: 80, hoverLabel: 'Tue' },
          '2026-05-21': { value: 80, top: 80, hoverLabel: 'Wed' },
        }}
        lines={goalLine}
      />,
    );

    expect(container.querySelector('.bar-graph__line')).toBeNull();
  });
});
