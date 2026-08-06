import { FEATURE_FLAG_KEYS, type FeatureFlagKey } from '@habsum/feature-flags/feature-flags';
import type { FeatureFlag } from '@habsum/feature-flags/types';
import { db } from './_private/db.js';

type FeatureFlagRow = {
  key: FeatureFlagKey;
  value: string | null;
  lastModifiedAt: number;
};

const insertFlag = db.prepare<{
  key: FeatureFlagKey;
  lastModifiedAt: number;
}>(`
  INSERT OR IGNORE INTO feature_flags (key, value, last_modified_at)
  VALUES (@key, NULL, @lastModifiedAt)
`);

const listFlags = db.prepare(`
  SELECT key, value, last_modified_at AS lastModifiedAt
  FROM feature_flags
  ORDER BY key
`);

const setFlagValue = db.prepare<{
  key: FeatureFlagKey;
  value: string | null;
  lastModifiedAt: number;
}>(`
  UPDATE feature_flags
  SET value = @value, last_modified_at = @lastModifiedAt
  WHERE key = @key
`);

const getFlag = db.prepare<{ key: FeatureFlagKey }>(`
  SELECT key, value, last_modified_at AS lastModifiedAt
  FROM feature_flags
  WHERE key = @key
`);

export class FeatureFlagRepository {
  constructor(
    configuredFlagKeys: readonly FeatureFlagKey[] = FEATURE_FLAG_KEYS,
    nowSeconds = Math.floor(Date.now() / 1000),
  ) {
    const insertConfiguredFlags = db.transaction(() => {
      for (const key of configuredFlagKeys) insertFlag.run({ key, lastModifiedAt: nowSeconds });
    });
    insertConfiguredFlags();
  }

  listFeatureFlags(): FeatureFlag<FeatureFlagKey>[] {
    return listFlags.all() as FeatureFlagRow[];
  }

  setFeatureFlagValue(
    key: FeatureFlagKey,
    value: string | null,
    lastModifiedAt = Math.floor(Date.now() / 1000),
  ): FeatureFlag<FeatureFlagKey> {
    const result = setFlagValue.run({ key, value, lastModifiedAt });
    if (result.changes !== 1) throw new Error(`feature flag not found: ${key}`);

    const flag = getFlag.get({ key }) as FeatureFlagRow | undefined;
    if (!flag) throw new Error(`feature flag not found after update: ${key}`);
    return flag;
  }
}
