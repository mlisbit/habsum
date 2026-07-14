import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Heatmap, type HeatmapEntry } from '@habsum/ui/components/graphs/Heatmap';

function entry(date: string): HeatmapEntry {
  return [
    date,
    {
      label: date,
      value: '—',
      ariaLabel: date,
      color: 'transparent',
    },
  ];
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Heatmap', () => {
  it('keeps the partial current week in its own rightmost column', () => {
    const { container } = render(
      <Heatmap
        entries={[
          [entry('2026-07-05'), entry('2026-07-06'), entry('2026-07-07')],
          [entry('2026-07-12'), entry('2026-07-13')],
        ]}
      />,
    );

    const visibleColumns = container.querySelectorAll('.heatmap__column');
    expect(visibleColumns).toHaveLength(1);
    expect(
      Array.from(visibleColumns[0]!.querySelectorAll('.heatmap__cell')).map((cell) =>
        cell.getAttribute('aria-label'),
      ),
    ).toEqual(['2026-07-12', '2026-07-13']);
  });
});
