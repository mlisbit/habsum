import { Navigate } from '@remix-run/react';

export default function UserSettingsIndex() {
  return <Navigate to="account" replace />;
}
