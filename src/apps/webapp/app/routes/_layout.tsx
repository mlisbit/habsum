import { Outlet } from 'react-router';

export default function AppLayout() {
  return (
    <div className="app">
      <div className="app__content">
        <Outlet />
      </div>
    </div>
  );
}
