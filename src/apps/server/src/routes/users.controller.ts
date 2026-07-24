import type { CreateOucSessionResponse } from '@habsum/types/api-responses/ouc-post';
import type { UsersPatchRequest } from '@habsum/types/api-responses/users-patch';
import type {
  CreateUserRequest,
  CreateUserResponse,
  ListUsersResponse,
} from '@habsum/types/common/misc';
import type { Request, Response } from 'express';
import { isPlausibleEmail, isSafeConfigUserId } from '../utils/request-utils.js';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import { AuthService } from '../services/auth-service.js';
import { ConfigService } from '../services/config-service.js';
import { UserService } from '../services/user-service.js';
import { resolveActiveSessionId } from '../utils/cookie-session-utils.js';
import { generateTemporaryPassword } from '../utils/password-utils.js';
import { sendServiceResult } from '../utils/controller-result-utils.js';

const WEB_VERSION_HEADER = 'x-habsum-web-version';
const configService = new ConfigService();
const authService = new AuthService();
const userService = new UserService();
const userAndAuthRepository = new UserAndAuthRepository();

function parseOptionalDisplayName(body: CreateUserRequest | undefined): {
  displayName?: string | null;
  error?: string;
} {
  if (!body || !('displayName' in body)) return {};
  const raw = body.displayName;
  if (raw === null) return { displayName: null };
  if (typeof raw !== 'string') {
    return { error: 'displayName must be a string or null' };
  }
  const trimmed = raw.trim();
  return { displayName: trimmed === '' ? null : trimmed };
}

function rollbackCreatedUser(username: string): void {
  configService.deleteUserConfig(username);
  userAndAuthRepository.deleteUserAuthRecord(username);
}

function countConfiguredHabits(username: string): number {
  return configService.loadUserConfig(username)?.habits.length ?? 0;
}

export const usersController = {
  getMe(req: Request, res: Response) {
    return sendServiceResult(res, () =>
      authService.getMe(resolveActiveSessionId(req), req.headers[WEB_VERSION_HEADER]),
    );
  },

  patchUser(req: Request<{ user: string }, unknown, UsersPatchRequest>, res: Response) {
    return sendServiceResult(res, () => userService.patchUser(req.params.user, req.body));
  },

  deleteUser(req: Request<{ user: string }>, res: Response) {
    return sendServiceResult(res, () => userService.deleteUser(req.params.user));
  },

  getUsers(_req: Request, res: Response) {
    const users: ListUsersResponse['users'] = userAndAuthRepository.listUserRows().map((row) => {
      const username = row.username;
      return {
        username,
        displayName: row.displayName,
        email: row.email ?? '',
        lastLoginAt: row.lastLoginAt,
        webAndApiVersion: row.webAndApiVersion,
        habitCount: countConfiguredHabits(username),
        eventCount: userAndAuthRepository.countUserEvents(username),
        entitlements: userService.entitlementsForUser(username),
      };
    });
    const body: ListUsersResponse = { users };
    return res.json(body);
  },

  postUsersOuc(req: Request, res: Response) {
    const name = typeof req.query.name === 'string' ? req.query.name : '';
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!isSafeConfigUserId(name)) {
      return res.status(400).json({ error: 'invalid user' });
    }

    if (!userAndAuthRepository.listUserRows().some((row) => row.username === name)) {
      return res.status(404).json({ error: 'user not found' });
    }

    const token = userAndAuthRepository.createOucUserSession(name);
    const body: CreateOucSessionResponse = { ok: true, user: name, token };
    return res.status(201).json(body);
  },

  async postUsers(req: Request<unknown, unknown, CreateUserRequest>, res: Response) {
    const rawEmail = req.body?.email;
    if (typeof rawEmail !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }
    const email = rawEmail.trim().toLowerCase();
    if (!isPlausibleEmail(email)) {
      return res.status(400).json({ error: 'invalid email' });
    }
    if (userAndAuthRepository.resolveUsernameByLoginId(email)) {
      return res.status(409).json({ error: 'email already in use' });
    }

    const sendInviteEmailFlag = req.body?.sendInviteEmail === true;
    const parsedDisplayName = parseOptionalDisplayName(req.body);
    if (parsedDisplayName.error) {
      return res.status(400).json({ error: parsedDisplayName.error });
    }
    const displayName = parsedDisplayName.displayName;
    if (sendInviteEmailFlag && !displayName) {
      return res.status(400).json({ error: 'displayName is required to send invite email' });
    }

    const name = userService.allocateUsernameForEmail(email);
    if (!name) {
      return res.status(409).json({ error: 'could not allocate username' });
    }

    const password = generateTemporaryPassword();
    const out = configService.createEmptyUserConfig(name);
    if (!out.ok) {
      const status = out.error.includes('already exists') ? 409 : 400;
      return res.status(status).json({ error: out.error });
    }

    userAndAuthRepository.setUserPassword(out.user, password);
    try {
      userAndAuthRepository.patchUserProfile(out.user, {
        email,
        ...(displayName !== undefined ? { displayName } : {}),
      });
    } catch (error) {
      rollbackCreatedUser(out.user);
      const message = error instanceof Error ? error.message : 'failed to save profile';
      return res.status(500).json({ error: message });
    }

    if (sendInviteEmailFlag) {
      try {
        await authService.sendInviteEmail(out.user, email, displayName!);
      } catch (error) {
        rollbackCreatedUser(out.user);
        const message = error instanceof Error ? error.message : 'failed to send invite email';
        return res.status(500).json({ error: message });
      }
    }

    const body: CreateUserResponse = {
      ok: true,
      user: out.user,
      password,
      ...(sendInviteEmailFlag ? { inviteEmailSent: true } : {}),
    };
    return res.status(201).json(body);
  },

  patchUsers(req: Request, res: Response) {
    const name = typeof req.query.name === 'string' ? req.query.name : '';
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!isSafeConfigUserId(name)) {
      return res.status(400).json({ error: 'invalid user' });
    }

    if (!userAndAuthRepository.listUserRows().some((row) => row.username === name)) {
      return res.status(404).json({ error: 'user not found' });
    }

    const password = generateTemporaryPassword();
    if (!userAndAuthRepository.updateLoginPassword(name, password)) {
      return res.status(404).json({ error: 'user not found' });
    }

    const body = { ok: true as const, user: name, password };
    return res.json(body);
  },

  deleteUsers(req: Request, res: Response) {
    const name = typeof req.query.name === 'string' ? req.query.name : '';
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!isSafeConfigUserId(name)) {
      return res.status(400).json({ error: 'invalid user' });
    }

    if (!userAndAuthRepository.listUserRows().some((row) => row.username === name)) {
      return res.status(404).json({ error: 'user not found' });
    }

    try {
      userAndAuthRepository.purgeUserData(name);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'purge failed';
      return res.status(400).json({ error: message });
    }

    const out = configService.deleteUserConfig(name);
    if (!out.ok) {
      const status = out.error === 'user not found' ? 404 : 400;
      return res.status(status).json({ error: out.error });
    }

    userAndAuthRepository.deleteUserAuthRecord(out.user);
    return res.json({ ok: true, user: out.user });
  },
};
