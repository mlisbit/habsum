import type { FeatureFlagKey, FeatureFlagState } from '@habsum/types/api-responses/feature-flags';
import { FEATURE_FLAG_KEYS } from '../constants.js';
import isFeatureFlagKey from '../utils/is-feature-flag-key.js';
import { db } from './_private/db.js';

type FeatureFlagRow = {
  key: string;
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

const deleteFlag = db.prepare<{ key: string }>(`
  DELETE FROM feature_flags
  WHERE key = @key
`);

const migrateLegacyAccountCreationValue = db.prepare(`
  UPDATE feature_flags
  SET value = 'noVerify'
  WHERE key = 'enable-user-account-creation' AND value = 'enabled'
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
    const synchronizeConfiguredFlags = db.transaction(() => {
      const configuredKeys = new Set<string>(configuredFlagKeys);
      for (const flag of listFlags.all() as FeatureFlagRow[]) {
        if (!configuredKeys.has(flag.key)) deleteFlag.run({ key: flag.key });
      }
      for (const key of configuredFlagKeys) insertFlag.run({ key, lastModifiedAt: nowSeconds });
      migrateLegacyAccountCreationValue.run();
    });
    synchronizeConfiguredFlags();
  }

  listFeatureFlags(): FeatureFlagState<FeatureFlagKey>[] {
    return (listFlags.all() as FeatureFlagRow[]).filter(
      (flag): flag is FeatureFlagState<FeatureFlagKey> => isFeatureFlagKey(flag.key),
    );
  }

  getFeatureFlag(key: FeatureFlagKey): FeatureFlagState<FeatureFlagKey> | null {
    return (getFlag.get({ key }) as FeatureFlagState<FeatureFlagKey> | undefined) ?? null;
  }

  setFeatureFlagValue(
    key: FeatureFlagKey,
    value: string | null,
    lastModifiedAt = Math.floor(Date.now() / 1000),
  ): FeatureFlagState<FeatureFlagKey> {
    const result = setFlagValue.run({ key, value, lastModifiedAt });
    if (result.changes !== 1) throw new Error(`feature flag not found: ${key}`);

    const flag = this.getFeatureFlag(key);
    if (!flag) throw new Error(`feature flag not found after update: ${key}`);
    return flag;
  }
}
