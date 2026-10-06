import { Navigate } from 'react-router';

export default function AdministratorRedirect() {
  return <Navigate to="users" replace />;
}
