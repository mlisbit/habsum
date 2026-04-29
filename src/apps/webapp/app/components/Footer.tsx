import { WEBAPP_VERSION } from '~/version';

/** Shows the bundled webapp semver (from `@habsum/webapp` `package.json`). */
export function Footer() {
  return <footer className="footer text-b-s text-light">v{WEBAPP_VERSION}</footer>;
}
