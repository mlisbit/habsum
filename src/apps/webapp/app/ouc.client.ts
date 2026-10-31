const OUC_WINDOW_NAME_PREFIX = 'habsum_ouc:';
const OUC_SESSION_STORAGE_KEY = 'habsum:ouc-session';
export const OUC_SESSION_HEADER = 'X-Habsum-Ouc-Session';
export const OUC_CHANGED_EVENT = 'habsum:ouc-changed';
const OUC_READY_MESSAGE = 'habsum:ouc-ready';
const OUC_TOKEN_MESSAGE = 'habsum:ouc-token';

let bootstrapResolve: ((ok: boolean) => void) | null = null;
let bootstrapPromise: Promise<boolean> | null = null;
let bootstrapCompleted: boolean | null = null;

export function getOucSessionToken(): string | null {
  try {
    return sessionStorage.getItem(OUC_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setOucSessionToken(token: string) {
  sessionStorage.setItem(OUC_SESSION_STORAGE_KEY, token);
  window.dispatchEvent(new Event(OUC_CHANGED_EVENT));
}

export function clearOucSessionToken() {
  sessionStorage.removeItem(OUC_SESSION_STORAGE_KEY);
  window.dispatchEvent(new Event(OUC_CHANGED_EVENT));
}

export function oucSessionRequestHeaders(): Record<string, string> {
  const token = getOucSessionToken();
  if (!token) return {};
  return { [OUC_SESSION_HEADER]: token };
}

function habitsUserFromPath(): string | null {
  const match = window.location.pathname.match(/^\/users\/([^/]+)\/habits\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function ensureBootstrapPending() {
  if (bootstrapPromise) return;
  bootstrapPromise = new Promise((resolve) => {
    bootstrapResolve = resolve;
    window.setTimeout(() => finishBootstrap(false), 15_000);
  });
}

function finishBootstrap(ok: boolean) {
  bootstrapCompleted = ok;
  bootstrapResolve?.(ok);
  bootstrapResolve = null;
  bootstrapPromise = null;
}

/** Popup windows wait here for the opener to deliver the operate-under token. */
export function awaitOucPopupBootstrap(): Promise<boolean> {
  if (!window.opener) return Promise.resolve(true);
  if (getOucSessionToken()) return Promise.resolve(true);
  if (bootstrapCompleted !== null) return Promise.resolve(bootstrapCompleted);
  ensureBootstrapPending();
  return bootstrapPromise!;
}

/** Popup side: signal readiness and accept the token from the opener window. */
export function installOucPopupListener(
  onToken: (token: string, user: string) => Promise<void>,
): () => void {
  const user = habitsUserFromPath();
  if (!window.opener || !user) return () => {};

  ensureBootstrapPending();
  const origin = window.location.origin;

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== origin) return;
    if (event.source !== window.opener) return;
    if (event.data?.type !== OUC_TOKEN_MESSAGE) return;
    if (event.data.user !== user) return;
    const token = typeof event.data.token === 'string' ? event.data.token : '';
    if (!token) return;

    void onToken(token, user)
      .then(() => finishBootstrap(true))
      .catch(() => finishBootstrap(false));
  };

  window.addEventListener('message', onMessage);
  window.opener.postMessage({ type: OUC_READY_MESSAGE, user }, origin);

  return () => window.removeEventListener('message', onMessage);
}

/** Opens a popup on the user's habits page; the token is delivered via postMessage. */
export function openOucWindow(username: string, token: string): Window | null {
  const url = `/users/${encodeURIComponent(username)}/habits`;
  const width = 1200;
  const height = 800;
  const left = Math.round(window.screenX + Math.max(0, (window.outerWidth - width) / 2));
  const top = Math.round(window.screenY + Math.max(0, (window.outerHeight - height) / 2));
  const features = [
    'popup=yes',
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'menubar=no',
    'toolbar=no',
    'location=yes',
    'status=no',
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');
  const popup = window.open(url, `${OUC_WINDOW_NAME_PREFIX}${username}`, features);
  if (!popup) return null;

  const origin = window.location.origin;
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== origin) return;
    if (event.source !== popup) return;
    if (event.data?.type !== OUC_READY_MESSAGE) return;
    if (event.data.user !== username) return;
    popup.postMessage({ type: OUC_TOKEN_MESSAGE, token, user: username }, origin);
  };

  window.addEventListener('message', onMessage);
  const cleanupTimer = window.setInterval(() => {
    if (popup.closed) {
      window.removeEventListener('message', onMessage);
      window.clearInterval(cleanupTimer);
    }
  }, 500);

  return popup;
}

/** Closes a popup opened via {@link openOucWindow}; no-op when the browser blocks close. */
export function closeOucPopupWindow() {
  window.close();
}
