import { WEBAPP_VERSION } from '~/version';

/** Shows the bundled webapp semver (from `@habsum/webapp` `package.json`). */
export function Footer({ className }: { className?: string }) {
  return (
    <footer className={['footer', 'text-b-s', 'text-light', className].filter(Boolean).join(' ')}>
      v{WEBAPP_VERSION}
    </footer>
  );
}
