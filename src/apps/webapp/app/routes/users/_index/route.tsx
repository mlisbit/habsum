import { Navigate } from '@remix-run/react';

export default function UsersIndex() {
  return <Navigate to="/login" replace />;
}
