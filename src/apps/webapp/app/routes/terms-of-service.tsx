import type { MetaFunction } from 'react-router';
import { PublicPage } from '~/components/PublicPage';
import TermsOfServiceContent from '~/content/terms-of-service.mdx';

export const meta: MetaFunction = () => [{ title: 'Habsum | Terms of Service' }];

export default function TermsOfServiceRoute() {
  return (
    <PublicPage title="Terms of Service">
      <TermsOfServiceContent />
    </PublicPage>
  );
}
