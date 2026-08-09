import type { MetaFunction } from 'react-router';
import { PublicPage } from '~/components/PublicPage';
import PrivacyPolicyContent from '~/content/privacy-policy.mdx';

export const meta: MetaFunction = () => [{ title: 'Habsum | Privacy Policy' }];

export default function PrivacyPolicyRoute() {
  return (
    <PublicPage title="Privacy Policy">
      <PrivacyPolicyContent />
    </PublicPage>
  );
}
