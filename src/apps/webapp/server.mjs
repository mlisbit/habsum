import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRequestListener } from '@react-router/node';

import * as build from './build/server/index.js';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDirectory = path.join(appDirectory, 'build', 'client');
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const apiUpstream = new URL(process.env.API_UPSTREAM ?? 'http://127.0.0.1:3001');
const handleSsrRequest = createRequestListener({ build, mode: process.env.NODE_ENV });

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function getRequestUrl(request) {
  return new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
}

function proxyApiRequest(request, response, requestUrl) {
  const upstreamPath = requestUrl.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
  const target = new URL(`${upstreamPath}${requestUrl.search}`, apiUpstream);
  const requestProxy = target.protocol === 'https:' ? httpsRequest : httpRequest;
  const forwardedFor = [request.headers['x-forwarded-for'], request.socket.remoteAddress]
    .filter(Boolean)
    .join(', ');
  const headers = {
    ...request.headers,
    host: target.host,
    'x-forwarded-for': forwardedFor,
    'x-forwarded-host': request.headers['x-forwarded-host'] ?? request.headers.host,
    'x-forwarded-proto':
      request.headers['x-forwarded-proto'] ?? (request.socket.encrypted ? 'https' : 'http'),
  };

  const proxyRequest = requestProxy(
    target,
    { method: request.method, headers },
    (proxyResponse) => {
      response.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers);
      proxyResponse.pipe(response);
    },
  );

  proxyRequest.on('error', (error) => {
    console.error('API proxy request failed:', error);
    if (!response.headersSent) response.writeHead(502);
    response.end('Bad Gateway');
  });
  request.on('aborted', () => proxyRequest.destroy());
  request.pipe(proxyRequest);
}

async function serveStaticFile(request, response, requestUrl) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;

  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    response.writeHead(400).end('Bad Request');
    return true;
  }

  const filePath = path.resolve(clientDirectory, `.${pathname}`);
  if (!filePath.startsWith(`${clientDirectory}${path.sep}`)) return false;

  let fileStats;
  try {
    fileStats = await stat(filePath);
  } catch {
    return false;
  }
  if (!fileStats.isFile()) return false;

  const headers = {
    'Content-Length': fileStats.size,
    'Content-Type': contentTypes.get(path.extname(filePath)) ?? 'application/octet-stream',
  };
  if (pathname.startsWith('/assets/')) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  }

  response.writeHead(200, headers);
  if (request.method === 'HEAD') {
    response.end();
    return true;
  }

  createReadStream(filePath).pipe(response);
  return true;
}

export function getWebServer() {
  return createServer(async (request, response) => {
    try {
      const requestUrl = getRequestUrl(request);
      if (/^\/api(?:\/|$)/.test(requestUrl.pathname)) {
        proxyApiRequest(request, response, requestUrl);
        return;
      }
      if (await serveStaticFile(request, response, requestUrl)) return;
      handleSsrRequest(request, response);
    } catch (error) {
      console.error('Web request failed:', error);
      if (!response.headersSent) response.writeHead(500);
      response.end('Internal Server Error');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  getWebServer().listen(port, () => {
    console.log(`Habsum webapp listening on port ${port}`);
  });
}
