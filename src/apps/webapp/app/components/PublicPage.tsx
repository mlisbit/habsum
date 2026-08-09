import type { ReactNode } from 'react';
import { Footer } from '~/components/Footer';

export function PublicPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="public-page">
      <article className="public-page__content">
        <h1 className="public-page__title text-h-xl">{title}</h1>
        <div className="public-page__body text-b-m">{children}</div>
      </article>
      <Footer variant="full" />
    </main>
  );
}
