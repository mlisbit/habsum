import type { CreateOucSessionResponse } from '@habsum/types/api-responses/ouc-post';
import type { UsersPatchRequest } from '@habsum/types/api-responses/users-patch';
import type {
  CreateUserRequest,
  CreateUserResponse,
  ListUsersResponse,
} from '@habsum/types/common/misc';
import type { Request, Response } from 'express';
import { isPlausibleEmail, isSafeConfigUserId } from '../request-helpers.js';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import { AuthService } from '../services/auth-service.js';
import { ConfigService } from '../services/config-service.js';
import { UserService } from '../services/user-service.js';
import { resolveActiveSessionId } from '../utils/cookie-session-utils.js';
import { generateTemporaryPassword } from '../utils/password-utils.js';

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
  userAndAuthRepository.deleteUserPin(username);
}

function countConfiguredHabits(username: string): number {
  return configService.loadUserConfig(username)?.habits.length ?? 0;
}

export const usersController = {
  getMe(req: Request, res: Response) {
    const result = authService.getMe(resolveActiveSessionId(req), req.headers[WEB_VERSION_HEADER]);
    return res.status(result.status).json(result.body);
  },

  patchUser(req: Request<{ user: string }, unknown, UsersPatchRequest>, res: Response) {
    const result = userService.patchUser(req.params.user, req.body);
    return res.status(result.status).json(result.body);
  },

  deleteUser(req: Request<{ user: string }>, res: Response) {
    const result = userService.deleteUser(req.params.user);
    return res.status(result.status).json(result.body);
  },

  getUsers(_req: Request, res: Response) {
    const usernames = configService.listUsers();
    userAndAuthRepository.ensureUserPins(usernames);
    const rowsByUsername = new Map(
      userAndAuthRepository.listUserRows().map((row) => [row.username, row]),
    );
    const users: ListUsersResponse['users'] = usernames.map((username) => {
      const row = rowsByUsername.get(username);
      return {
        username,
        displayName: row?.displayName ?? null,
        email: row?.email ?? '',
        lastLoginAt: row?.lastLoginAt ?? null,
        webAndApiVersion: row?.webAndApiVersion ?? null,
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

    const existing = configService.listUsers();
    if (!existing.includes(name)) {
      return res.status(404).json({ error: 'user not found' });
    }

    userAndAuthRepository.ensureUserPins(existing);
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

    userAndAuthRepository.setUserPin(out.user, password);
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

    const existing = configService.listUsers();
    if (!existing.includes(name)) {
      return res.status(404).json({ error: 'user not found' });
    }

    const password = generateTemporaryPassword();
    userAndAuthRepository.ensureUserPins(existing);
    if (!userAndAuthRepository.updateLoginPin(name, password)) {
      userAndAuthRepository.setUserPin(name, password);
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

    const existing = configService.listUsers();
    if (!existing.includes(name)) {
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

    userAndAuthRepository.deleteUserPin(out.user);
    return res.json({ ok: true, user: out.user });
  },
};
