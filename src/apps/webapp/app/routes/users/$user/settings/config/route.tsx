import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ConfigSettings } from '~/components/config-components/ConfigSettings';
import { SettingsPageCard } from '~/components/SettingsPageCard';

export default function UserSettingsConfig() {
  const navigate = useNavigate();
  const { user } = useParams();
  const [searchParams] = useSearchParams();
  if (!user) {
    return <p className="warn text-b-s">Missing user</p>;
  }
  return (
    <ConfigSettings
      user={decodeURIComponent(user)}
      mode="yaml"
      version={searchParams.get('v') ?? undefined}
      renderCard={(card) => (
        <SettingsPageCard
          {...card}
          onBack={() => navigate(`/users/${encodeURIComponent(user)}/settings/habits`)}
        />
      )}
    />
  );
}
