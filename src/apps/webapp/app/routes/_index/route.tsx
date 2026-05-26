import { Navigate } from '@remix-run/react';

export default function IndexRoute() {
  return <Navigate to="/login" replace />;
}
