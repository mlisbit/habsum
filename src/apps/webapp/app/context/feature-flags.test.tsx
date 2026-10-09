// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeatureFlagsProvider, useFeatureFlags } from './feature-flags';

const flagKeys = ['enabled-flag', 'disabled-flag'] as const;

function Consumer() {
  const { getFlagValue } = useFeatureFlags<(typeof flagKeys)[number]>();

  return (
    <span>
      {getFlagValue('enabled-flag') ?? 'disabled'} / {getFlagValue('disabled-flag') ?? 'disabled'}
    </span>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FeatureFlagsProvider', () => {
  it('uses initial flags without making a browser request', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const flags = [
      {
        key: 'enabled-flag',
        value: 'enabled',
        lastModifiedAt: 1_900_000_000,
        name: 'Enabled flag',
        description: 'An enabled flag.',
        options: { enabled: { text: 'Enabled' } },
      },
      {
        key: 'disabled-flag',
        value: null,
        lastModifiedAt: 1_900_000_000,
        name: 'Disabled flag',
        description: 'A disabled flag.',
        options: { enabled: { text: 'Enabled' } },
      },
    ] as const;

    render(
      <FeatureFlagsProvider flags={flags}>
        <Consumer />
      </FeatureFlagsProvider>,
    );

    expect(screen.getByText('enabled / disabled')).toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
