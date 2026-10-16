// exclusive-bem-block: site-header
import { Toggle } from '@habsum/ui/components/Toggle';
import { DOCS_URL } from '../constants';
import GithubLink from './GithubLink';

export default function Header({
  stars,
  isDark,
  onThemeChange,
}: {
  stars: number | null;
  isDark: boolean;
  onThemeChange: (dark: boolean) => void;
}) {
  return (
    <header className="site-header">
      <a href="#top" className="site-header__brand text-h-l" aria-label="Habsum home">
        <img
          className="site-header__icon"
          src={`${import.meta.env.BASE_URL}icon.svg`}
          alt=""
          width="36"
          height="36"
        />
        Habsum
        <span className="site-header__brand-dot text__accent" aria-hidden="true">
          .
        </span>
      </a>
      <nav className="site-header__nav" aria-label="Main navigation">
        <a href={DOCS_URL} className="site-header__docs text-b-m">
          Docs
        </a>
        <span className="site-header__theme">
          <Toggle
            checked={isDark}
            onChange={onThemeChange}
            checkedIllustration="sun"
            uncheckedIllustration="moon"
            aria-label="Dark mode"
            title="Toggle light and dark mode"
          />
        </span>
        <GithubLink stars={stars} />
      </nav>
    </header>
  );
}
