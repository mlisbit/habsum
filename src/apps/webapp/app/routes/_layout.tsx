import { Outlet } from '@remix-run/react';

export default function AppLayout() {
  return (
    <div className="app">
      <div className="app__content">
        <Outlet />
      </div>
    </div>
  );
}
