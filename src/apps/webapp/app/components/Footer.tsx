import { WEBAPP_VERSION } from '~/version';

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={['footer', 'text-b-s', 'text-light', className].filter(Boolean).join(' ')}>
      <span className="footer__version">v{WEBAPP_VERSION}</span>
    </footer>
  );
}
