// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeatureFlagsProvider, useFeatureFlags } from './feature-flags-context';

const flagKeys = ['enabled-flag', 'disabled-flag'] as const;

function Consumer() {
  const { isFlagEnabled } = useFeatureFlags<(typeof flagKeys)[number]>();

  return (
    <span>
      {isFlagEnabled('enabled-flag') ? 'Enabled' : 'Disabled'} /{' '}
      {isFlagEnabled('disabled-flag') ? 'Enabled' : 'Disabled'}
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
      { key: 'enabled-flag', value: 'enabled', lastModifiedAt: 1_900_000_000 },
      { key: 'disabled-flag', value: null, lastModifiedAt: 1_900_000_000 },
      { key: 'unrequested-flag', value: 'enabled', lastModifiedAt: 1_900_000_000 },
    ] as const;

    render(
      <FeatureFlagsProvider flags={flags} flagKeys={flagKeys}>
        <Consumer />
      </FeatureFlagsProvider>,
    );

    expect(screen.getByText('Enabled / Disabled')).toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
