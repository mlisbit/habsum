import { useEffect } from 'react';

export default function UsersIndex() {
  useEffect(() => {
    window.location.replace('/login');
  }, []);

  return null;
}
