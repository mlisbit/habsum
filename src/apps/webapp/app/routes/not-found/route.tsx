import { Link, data } from 'react-router';
import type { MetaFunction } from 'react-router';
import { HomeLink } from '~/components/HomeLink';

export const meta: MetaFunction = () => [{ title: 'Page not found · Habsum' }];

export function loader() {
  return data(null, { status: 404 });
}

export default function NotFoundRoute() {
  return (
    <div className="not-found">
      <HomeLink />
      <main className="not-found__main">
        <section className="not-found__card">
          <p className="text-h-xl text-bold link--fancy not-found__code" aria-hidden="true">
            404
          </p>
          <div className="not-found__copy">
            <h1 className="text-h-xl">Page not found. Sorry.</h1>
          </div>
        </section>
      </main>
    </div>
  );
}
