export type FeatureFlag<TKey extends string = string> = {
  key: TKey;
  /** `null` is disabled; any configured string value is enabled. */
  value: string | null;
  /** Server UTC Unix timestamp in seconds. */
  lastModifiedAt: number;
};

export type FeatureFlagsGetResponse<TKey extends string = string> = {
  flags: FeatureFlag<TKey>[];
};

export type FeatureFlagPostRequest<TKey extends string = string> = {
  key: TKey;
  value: string | null;
};

export type FeatureFlagPostResponse<TKey extends string = string> = {
  flag: FeatureFlag<TKey>;
};
