import type { CreateOucSessionResponse } from '@habsum/types/api-responses/ouc-post';
import type { UserInviteEmailPostRequest } from '@habsum/types/api-responses/user-invite-email-post';
import type { UsernameAvailabilityGetResponse } from '@habsum/types/api-responses/username-availability-get';
import type { UsersPatchRequest } from '@habsum/types/api-responses/users-patch';
import type {
  CreateUserFieldErrors,
  CreateUserRequest,
  CreateUserResponse,
  CreateUserValidationResult,
  ListUsersResponse,
} from '@habsum/types/common/misc';
import type { Request, Response } from 'express';
import { generateTemporaryPassword } from '@habsum/utils/password';
import { isPlausibleEmail, isSafeConfigUserId } from '../utils/request-utils.js';
import hasOnlyUsernameCharacters from '../utils/has-only-username-characters.js';
import isForbiddenUsername from '@habsum/utils/is-forbidden-username';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import { AuthService } from '../services/auth-service.js';
import { ConfigService } from '../services/config-service.js';
import { UserService } from '../services/user-service.js';
import { resolveActiveSessionId } from '../utils/cookie-session-utils.js';
import { sendAsyncServiceResult, sendServiceResult } from '../utils/controller-result-utils.js';

const WEB_VERSION_HEADER = 'x-habsum-web-version';
const configService = new ConfigService();
const authService = new AuthService();
const userService = new UserService();
const userAndAuthRepository = new UserAndAuthRepository();

function rollbackCreatedUser(username: string): void {
  configService.deleteUserConfig(username);
  userAndAuthRepository.deleteUserAuthRecord(username);
}

function isUsernameTaken(username: string): boolean {
  return (
    configService.listConfiguredUsers().includes(username) ||
    userAndAuthRepository.listUserRows().some((row) => row.username === username)
  );
}

function getCreateUserRequest(body: CreateUserRequest | undefined): CreateUserRequest {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';

  return {
    ...(email ? { email } : {}),
    ...(username ? { username } : {}),
    ...(displayName ? { displayName } : {}),
  };
}

function sendCreateUserValidationError(
  res: Response,
  status: number,
  request: CreateUserRequest,
  errors: CreateUserFieldErrors,
) {
  const body: CreateUserValidationResult = { request, errors };
  return res.status(status).json(body);
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

  getUsernameAvailability(req: Request, res: Response) {
    const username = typeof req.query.username === 'string' ? req.query.username.trim() : '';
    if (username && !hasOnlyUsernameCharacters(username)) {
      return sendCreateUserValidationError(
        res,
        400,
        { username },
        {
          username: 'Username can only contain letters and numbers.',
        },
      );
    }
    if (!isSafeConfigUserId(username) || isForbiddenUsername(username)) {
      return sendCreateUserValidationError(
        res,
        400,
        { ...(username ? { username } : {}) },
        {
          username: 'Enter a valid username.',
        },
      );
    }

    const body: UsernameAvailabilityGetResponse = { available: !isUsernameTaken(username) };
    return res.json(body);
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

  postUsers(req: Request<unknown, unknown, CreateUserRequest>, res: Response) {
    const rawEmail = req.body?.email;
    const rawUsername = req.body?.username;
    const rawDisplayName = req.body?.displayName;
    const request = getCreateUserRequest(req.body);
    const hasEmail = rawEmail !== undefined;
    const hasUsername = rawUsername !== undefined;
    if (!hasEmail && !hasUsername) {
      return sendCreateUserValidationError(res, 400, request, {
        email: 'Enter an email or username.',
      });
    }
    if (rawDisplayName !== undefined && typeof rawDisplayName !== 'string') {
      return sendCreateUserValidationError(res, 400, request, {
        displayName: 'Display name must be a string.',
      });
    }
    const displayName = request.displayName;

    let email: string | undefined;
    if (hasEmail) {
      if (typeof rawEmail !== 'string' || !isPlausibleEmail(rawEmail)) {
        return sendCreateUserValidationError(res, 400, request, {
          email: 'Enter a valid email address.',
        });
      }
      email = request.email!;
      if (userAndAuthRepository.resolveUsernameByLoginId(email)) {
        return sendCreateUserValidationError(res, 409, request, {
          email: 'Email is already in use.',
        });
      }
    }

    let name: string;
    if (hasUsername) {
      if (typeof rawUsername !== 'string') {
        return sendCreateUserValidationError(res, 400, request, {
          username: 'Enter a valid username.',
        });
      }
      name = request.username ?? '';
      if (name && !hasOnlyUsernameCharacters(name)) {
        return sendCreateUserValidationError(res, 400, request, {
          username: 'Username can only contain letters and numbers.',
        });
      }
      if (!isSafeConfigUserId(name) || isForbiddenUsername(name)) {
        return sendCreateUserValidationError(res, 400, request, {
          username: 'Enter a valid username.',
        });
      }
      if (isUsernameTaken(name)) {
        return sendCreateUserValidationError(res, 409, request, {
          username: 'Username is already in use.',
        });
      }
    } else {
      const allocatedName = userService.allocateUsernameForEmail(email!);
      if (!allocatedName) {
        return sendCreateUserValidationError(res, 409, request, {
          email: 'Could not generate an available username for this email.',
        });
      }
      name = allocatedName;
    }

    const password = generateTemporaryPassword();
    const out = configService.createEmptyUserConfig(name);
    if (!out.ok) {
      const status = out.error.includes('already exists') ? 409 : 400;
      const field = request.username ? 'username' : 'email';
      return sendCreateUserValidationError(res, status, request, { [field]: out.error });
    }

    userAndAuthRepository.setUserPassword(out.user, password);
    if (email || displayName) {
      try {
        userAndAuthRepository.patchUserProfile(out.user, {
          ...(email ? { email } : {}),
          ...(displayName ? { displayName } : {}),
        });
      } catch (error) {
        rollbackCreatedUser(out.user);
        const message = error instanceof Error ? error.message : 'failed to save profile';
        const field = email ? 'email' : 'displayName';
        return sendCreateUserValidationError(res, 500, request, { [field]: message });
      }
    }

    let registrationUrl: string;
    try {
      registrationUrl = authService.createInviteRegistrationUrl(out.user);
    } catch (error) {
      rollbackCreatedUser(out.user);
      const message = error instanceof Error ? error.message : 'failed to create registration URL';
      const field = request.username ? 'username' : 'email';
      return sendCreateUserValidationError(res, 500, request, { [field]: message });
    }

    const body: CreateUserResponse = {
      ok: true,
      user: out.user,
      password,
      ...(email ? { email } : {}),
      registrationUrl,
    };
    return res.status(201).json(body);
  },

  postUserInviteEmail(
    req: Request<{ user: string }, unknown, UserInviteEmailPostRequest>,
    res: Response,
  ) {
    return sendAsyncServiceResult(res, () =>
      authService.sendInviteEmail(req.params.user, req.body?.registrationUrl),
    );
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

    return sendServiceResult(res, () => userService.issueTemporaryPassword(name));
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

    return sendServiceResult(res, () => {
      const result = userService.deleteUser(name);
      return { ok: result.ok, user: result.username };
    });
  },
};
