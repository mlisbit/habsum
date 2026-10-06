import { Navigate, useParams } from 'react-router';

const ADMINISTRATOR_SECTIONS = new Set(['users', 'options', 'info']);

export default function LegacyAdministratorRedirect() {
  const { user, section } = useParams();
  const destinationSection = section && ADMINISTRATOR_SECTIONS.has(section) ? section : 'users';
  return (
    <Navigate
      to={`/users/${encodeURIComponent(user ?? '')}/settings/administrator/${destinationSection}`}
      replace
    />
  );
}
