import { useParams } from '@remix-run/react';
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
      renderCard={(card) => <SettingsPageCard {...card} />}
    />
  );
}
