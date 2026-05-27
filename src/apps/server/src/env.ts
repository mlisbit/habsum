/** True for local dev (`development` or unset). False in production and test. */
export function isDevelopment(): boolean {
  const env = process.env.NODE_ENV;
  return env !== 'production' && env !== 'test';
}
