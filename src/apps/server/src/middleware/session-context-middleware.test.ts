import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import SessionContext from '../utils/classes/session-context.js';
import { OUC_SESSION_HEADER, SESSION_COOKIE_NAME } from '../utils/cookie-session-utils.js';

const repository = new UserAndAuthRepository();
const cookieUser = 'session-context-user';
const oucUser = 'session-context-ouc';
const adminUser = 'session-context-admin';
const app = createApp();

app.get('/session-context-test', (_req, res) => {
  if (res.locals.session !== null) expect(res.locals.session).toBeInstanceOf(SessionContext);
  res.json(res.locals.session);
});

beforeAll(() => {
  repository.setUserPassword(cookieUser, 'secret');
  repository.setUserPassword(oucUser, 'secret');
  repository.createInitialAdminUser(adminUser, 'secret');
});

afterEach(() => {
  repository.setUserDemo(cookieUser, false);
  vi.restoreAllMocks();
});

afterAll(() => {
  for (const username of [cookieUser, oucUser, adminUser]) {
    repository.deleteUserAuthRecord(username);
  }
});

describe('session context', () => {
  it('sets session to null on a public request without credentials', async () => {
    await request(app).get('/session-context-test').expect(200, null);
    await request(app).get('/health').expect(200);
  });

  it('provides the cookie session identity and flags', async () => {
    const sessionToken = repository.createUserSession(cookieUser);
    await request(app)
      .get('/session-context-test')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
      .expect(200, {
        username: cookieUser,
        sessionToken,
        isDemoUser: false,
        isOUCSession: false,
        isAdmin: false,
      });
  });

  it('refreshes demo and administrator flags on each request', async () => {
    const cookie = `${SESSION_COOKIE_NAME}=${repository.createUserSession(cookieUser)}`;
    repository.setUserDemo(cookieUser, true);
    const demo = await request(app).get('/session-context-test').set('Cookie', cookie).expect(200);
    expect(demo.body).toMatchObject({ isDemoUser: true, isAdmin: false });
    repository.setUserDemo(cookieUser, false);
    const ordinary = await request(app)
      .get('/session-context-test')
      .set('Cookie', cookie)
      .expect(200);
    expect(ordinary.body.isDemoUser).toBe(false);

    const admin = await request(app)
      .get('/session-context-test')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${repository.createUserSession(adminUser)}`)
      .expect(200);
    expect(admin.body).toMatchObject({ username: adminUser, isAdmin: true, isDemoUser: false });
  });

  it.each([false, true])('prefers a valid OUC header with cookie present=%s', async (hasCookie) => {
    const sessionToken = repository.createOucUserSession(oucUser);
    const headers: Record<string, string> = { [OUC_SESSION_HEADER]: ` ${sessionToken} ` };
    if (hasCookie) {
      headers.Cookie = `${SESSION_COOKIE_NAME}=${repository.createUserSession(adminUser)}`;
    }

    await request(app).get('/session-context-test').set(headers).expect(200, {
      username: oucUser,
      sessionToken,
      isDemoUser: false,
      isOUCSession: true,
      isAdmin: false,
    });
  });

  it('identifies an OUC session supplied through a cookie', async () => {
    const sessionToken = repository.createOucUserSession(oucUser);
    const response = await request(app)
      .get('/session-context-test')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
      .expect(200);
    expect(response.body).toMatchObject({ username: oucUser, sessionToken, isOUCSession: true });
  });

  it.each(['forged', 'expired', 'revoked', 'ordinary'])(
    'ignores a %s OUC header and falls back to the cookie',
    async (kind) => {
      let token = 'OUC_forged-session';
      if (kind === 'expired') {
        token = repository.createOucUserSession(oucUser, -1);
      } else if (kind === 'revoked') {
        token = repository.createOucUserSession(oucUser);
        repository.revokeUserSession(token);
      } else if (kind === 'ordinary') {
        token = repository.createUserSession(oucUser);
      }

      await request(app)
        .get('/session-context-test')
        .set(OUC_SESSION_HEADER, token)
        .expect(200, null);

      const sessionToken = repository.createUserSession(cookieUser);
      const response = await request(app)
        .get('/session-context-test')
        .set(OUC_SESSION_HEADER, token)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .expect(200);
      expect(response.body).toMatchObject({
        username: cookieUser,
        sessionToken,
        isOUCSession: false,
      });
    },
  );

  it.each(['unknown', 'expired', 'revoked'])(
    'sets session to null for a %s cookie session',
    async (kind) => {
      let token = 'unknown-session';
      if (kind === 'expired') {
        token = repository.createUserSession(cookieUser, -1);
      } else if (kind === 'revoked') {
        token = repository.createUserSession(cookieUser);
        repository.revokeUserSession(token);
      }

      await request(app)
        .get('/session-context-test')
        .set('Cookie', `${SESSION_COOKIE_NAME}=${token}`)
        .expect(200, null);
    },
  );
});

describe('user route ownership', () => {
  it.each([
    ['patch', ''],
    ['delete', ''],
    ['get', '/security'],
    ['delete', '/security/sessions'],
    ['delete', '/security/sessions/token'],
    ['post', '/password'],
    ['get', '/habits'],
    ['get', '/habits/history'],
    ['patch', '/habits'],
    ['get', '/config'],
    ['put', '/config'],
    ['get', '/data'],
  ] as const)('protects %s /users/:user%s centrally', async (method, suffix) => {
    const path = `/users/${oucUser}${suffix}`;
    await request(app)[method](path).expect(401, { error: 'not authenticated' });

    for (const username of [cookieUser, adminUser]) {
      await request(app)
        [method](path)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${repository.createUserSession(username)}`)
        .expect(403, { error: 'forbidden' });
    }
  });

  it('resolves the session once across the app middleware and user parameter hook', async () => {
    const sessionToken = repository.createUserSession(cookieUser);
    const lookup = vi.spyOn(UserAndAuthRepository.prototype, 'getUsernameForSession');
    const response = await request(app)
      .get(`/users/${cookieUser}/security`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sessionToken}`)
      .expect(200);

    expect(lookup).toHaveBeenCalledExactlyOnceWith(sessionToken);
    expect(response.body.sessions).toContainEqual(
      expect.objectContaining({ token: sessionToken.slice(0, 8), isActive: true }),
    );
  });

  it('checks route ownership against the OUC identity', async () => {
    const sessionToken = repository.createOucUserSession(oucUser);
    const headers = {
      Cookie: `${SESSION_COOKIE_NAME}=${repository.createUserSession(cookieUser)}`,
      [OUC_SESSION_HEADER]: sessionToken,
    };
    await request(app).get(`/users/${oucUser}/security`).set(headers).expect(200);
    await request(app)
      .get(`/users/${cookieUser}/security`)
      .set(headers)
      .expect(403, { error: 'forbidden' });
  });

  it('matches the decoded username in the route', async () => {
    await request(app)
      .get(`/users/${cookieUser.replace('s', '%73')}/security`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${repository.createUserSession(cookieUser)}`)
      .expect(200);
  });
});
