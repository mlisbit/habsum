import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigHabitDraft } from '~/api.client';
import { DataVisualizationWidget } from '../config-components/renderers/_private/widgets/DataVisualizationWidget';

const singleSelectHistoryDraft: ConfigHabitDraft = {
  name: 'Read',
  type: 'single_select',
  goal: '',
  repeat: ['monday'],
  quickAddItems: [],
  optionsText: 'yes\nno',
  theme: '',
  streakEnabled: false,
  streakOptionsText: '',
  streakFrequencyPerWeek: '7',
  streakShowLongest: false,
  historyEnabled: true,
  historyDisplays: ['heatmap'],
  historyPeriodAmount: '3',
  historyPeriodUnit: 'w',
};

function StatefulDataVisualizationWidget() {
  const [draft, setDraft] = useState(singleSelectHistoryDraft);
  return (
    <DataVisualizationWidget
      draft={draft}
      patch={(partial) => setDraft((current) => ({ ...current, ...partial }))}
      type={['heatmap']}
    />
  );
}

afterEach(cleanup);

describe('DataVisualizationWidget', () => {
  it('shows only the supported visualization types', () => {
    render(
      <DataVisualizationWidget
        draft={singleSelectHistoryDraft}
        patch={vi.fn()}
        type={['heatmap']}
      />,
    );

    expect(screen.getByText('Data Visualization')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Heatmap' })).toBeTruthy();
    expect(screen.queryByText('Weekly history')).toBeNull();
    expect(screen.getByRole('switch', { name: 'Disable Data Visualization' })).toBeTruthy();
  });

  it('restores supported visualizations when the section is re-enabled', () => {
    const patch = vi.fn();
    render(
      <DataVisualizationWidget
        draft={{ ...singleSelectHistoryDraft, historyEnabled: false }}
        patch={patch}
        type={['heatmap']}
      />,
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Enable Data Visualization' }));

    expect(patch).toHaveBeenCalledWith({
      historyEnabled: true,
      historyDisplays: ['heatmap'],
      historyPeriodAmount: '3',
      historyPeriodUnit: 'w',
    });
  });

  it('stays open but switches off when the last visualization is deselected', () => {
    render(<StatefulDataVisualizationWidget />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Heatmap' }));

    expect(screen.getByRole('switch', { name: 'Enable Data Visualization' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Heatmap' })).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: 'Heatmap' }) as HTMLInputElement).checked).toBe(
      false,
    );
  });

  it('enables weekly history from its checkbox', () => {
    const patch = vi.fn();
    render(
      <DataVisualizationWidget
        draft={{
          ...singleSelectHistoryDraft,
          type: 'summation',
          historyDisplays: ['heatmap'],
        }}
        patch={patch}
        type={['weekly_history', 'heatmap']}
      />,
    );

    const weeklyHistory = screen.getByRole('checkbox', { name: 'Weekly history' });
    expect((weeklyHistory as HTMLInputElement).checked).toBe(false);
    fireEvent.click(weeklyHistory);

    expect(patch).toHaveBeenCalledWith({
      historyEnabled: true,
      historyDisplays: ['heatmap', 'weekly_history'],
      historyPeriodAmount: '3',
      historyPeriodUnit: 'w',
    });
  });

  it('configures the period with a dropdown when weekly history is selected', () => {
    const patch = vi.fn();
    render(
      <DataVisualizationWidget
        draft={{
          ...singleSelectHistoryDraft,
          type: 'summation',
          historyDisplays: ['weekly_history'],
          historyPeriodAmount: '2',
        }}
        patch={patch}
        type={['weekly_history', 'heatmap']}
      />,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Weekly history period' }), {
      target: { value: '1' },
    });

    expect(patch).toHaveBeenCalledWith({
      historyEnabled: true,
      historyDisplays: ['weekly_history'],
      historyPeriodAmount: '1',
      historyPeriodUnit: 'w',
    });
  });
});
