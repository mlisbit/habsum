import { useParams } from 'react-router';
import { ConfigSettings } from '~/components/config-components/ConfigSettings';
import { SettingsPageCard } from '~/components/SettingsPageCard';

export default function UserSettingsConfig() {
  const { user } = useParams();
  if (!user) {
    return <p className="warn text-b-s">Missing user</p>;
  }
  return (
    <ConfigSettings
      user={decodeURIComponent(user)}
      mode="yaml"
      renderCard={(card) => <SettingsPageCard {...card} />}
    />
  );
}
