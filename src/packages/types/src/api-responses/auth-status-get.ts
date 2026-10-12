export type AuthFeatures = {
  accountSignup: boolean;
  forgotPassword: boolean;
};

/**
 * Endpoint called essentially on every page, gives general app feature flags, plus other stuff.
 */
export type AuthStatusGetResponse = {
  redirectPath: '/welcome' | null;
  features: AuthFeatures;
};
