import type { MetaFunction } from 'react-router';
import { PublicPage } from '~/components/PublicPage';

export const meta: MetaFunction = () => [{ title: 'Habsum | Contact' }];

export default function ContactRoute() {
  return (
    <PublicPage title="Contact">
      <a className="text-link" href="mailto:mac@habsum.com">
        mac@habsum.com
      </a>
    </PublicPage>
  );
}
