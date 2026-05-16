import { useEffect } from 'react';

export default function IndexRoute() {
  useEffect(() => {
    window.location.replace('/login');
  }, []);

  return null;
}
