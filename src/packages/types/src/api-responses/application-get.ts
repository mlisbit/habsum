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
  demoEnabled: boolean;
  demoUser: { username: string; password: string } | null;
  serverTime: ServerTimeResponse;
  database: { path: string };
  redirectPath: '/welcome' | null;
  features: AuthFeatures;
};
