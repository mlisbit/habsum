import pkg from '../package.json';

/** Webapp package semver bundled from package.json at compile time. */
export const WEBAPP_VERSION = pkg.version;
