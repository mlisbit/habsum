// exclusive-bem-block: github-link
import { ArrowUpRight, Star } from 'lucide-react';
import { GITHUB_URL } from '../constants';

export default function GithubLink({
  stars,
  primary = false,
}: {
  stars?: number | null;
  primary?: boolean;
}) {
  const classes = {
    primary: 'github-link github-link--primary button button--primary text-b-l text-bold',
    secondary: 'github-link button button--secondary text-b-m',
  };

  return (
    <a href={GITHUB_URL} className={classes[primary ? 'primary' : 'secondary']}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.64 1.22 3.28.93.1-.73.39-1.22.71-1.5-2.5-.29-5.12-1.25-5.12-5.56 0-1.23.44-2.24 1.16-3.03-.12-.29-.5-1.44.11-3 0 0 .94-.3 3.09 1.15A10.76 10.76 0 0 1 12 6.13c.96 0 1.92.13 2.81.38 2.15-1.46 3.09-1.15 3.09-1.15.61 1.56.23 2.71.11 3 .72.79 1.16 1.8 1.16 3.03 0 4.32-2.63 5.27-5.14 5.55.4.35.76 1.03.76 2.08v3.11c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
      </svg>
      <span>{primary ? 'View GitHub' : 'GitHub'}</span>
      {primary ? (
        <ArrowUpRight size={18} aria-hidden="true" />
      ) : (
        <span className="github-link__stars" aria-live="polite">
          <Star size={14} aria-hidden="true" />
          {stars == null ? 'Star' : stars.toLocaleString('en-US')}
          {stars != null ? <span className="github-link__sr-only"> stars</span> : null}
        </span>
      )}
    </a>
  );
}
