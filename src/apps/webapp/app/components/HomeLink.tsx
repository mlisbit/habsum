import { Link } from 'react-router';
import { Brand } from '~/components/Brand';

export function HomeLink() {
  return (
    <Link className="home-link" to="/" aria-label="Habsum homepage">
      <Brand size="large" />
    </Link>
  );
}
