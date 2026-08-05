import { PassThrough } from 'node:stream';
import type { AppLoadContext, EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';
import { createReadableStreamFromReadable } from '@react-router/node';
import { renderToPipeableStream } from 'react-dom/server';

export const streamTimeout = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  if (request.method.toUpperCase() === 'HEAD') {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders });
  }

  return new Promise<Response>((resolve, reject) => {
    let renderFailed = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onAllReady() {
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            },
          });
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set('Content-Type', 'text/html');
          pipe(body);
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: renderFailed ? 500 : responseStatusCode,
            }),
          );
        },
        onShellError(error) {
          clearTimeout(timeoutId);
          reject(error);
        },
        onError(error) {
          renderFailed = true;
          console.error(error);
        },
      },
    );

    timeoutId = setTimeout(abort, streamTimeout + 1_000);
  });
}
