import { Outlet, useNavigation } from '@remix-run/react';
import { Loader } from '~/core-components/Loader';

export default function AppLayout() {
  const navigation = useNavigation();
  const isTransitioning = navigation.state !== 'idle';

  return (
    <div className="app">
      {isTransitioning ? <Loader label="Loading page" /> : null}
      <div className="app__content">
        <Outlet />
      </div>
    </div>
  );
}
