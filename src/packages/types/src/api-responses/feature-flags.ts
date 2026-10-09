export type FeatureFlagKey = 'enable-user-account-creation';

export type FeatureFlagState<TKey extends string = string> = {
  key: TKey;
  /** `null` selects Disabled; otherwise this is a key from `options`. */
  value: string | null;
  /** Server UTC Unix timestamp in seconds. */
  lastModifiedAt: number;
};

export type FeatureFlag<TKey extends string = string> = FeatureFlagState<TKey> & {
  name: string;
  description: string;
  options: Record<
    string,
    {
      text: string;
      disabled?: string;
    }
  >;
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
