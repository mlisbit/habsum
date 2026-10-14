import type { ServerTimeResponse } from '../common/misc';

export type AuthFeatures = {
  accountSignup: boolean;
  forgotPassword: boolean;
};

/**
 * Application metadata, server diagnostics, and feature availability used on every page.
 */
export type ApplicationGetResponse = {
  apiVersion: string;
  serverTime: ServerTimeResponse;
  database: { path: string };
  redirectPath: '/welcome' | null;
  features: AuthFeatures;
};
