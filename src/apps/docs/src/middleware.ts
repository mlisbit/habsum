import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async ({ url }, next) => {
  const response = await next();
  if (!import.meta.env.DEV || !response.headers.get('content-type')?.includes('text/html')) {
    return response;
  }

  // Astro's development module URLs omit the /docs base. Keep these requests
  // on Astro's server instead of passing them to the homepage's React server.
  const assetsOrigin = new URL(url.origin);
  assetsOrigin.port = '3003';
  const html = (await response.text()).replace(
    /(<(?:script|link)\b[^>]*?\s(?:src|href)=["'])(\/(?:@|node_modules\/|src\/)[^"']*)(["'])/g,
    (_match, before: string, path: string, after: string) =>
      `${before}${assetsOrigin.origin}${path}${after}`,
  );
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
