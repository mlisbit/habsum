import { Router, type Request, type Response } from 'express';
import type {
  CreateUserRequest,
  CreateUserResponse,
  ListUsersResponse,
} from '@habsum/types/common/misc';
import type { CreateOucSessionResponse } from '@habsum/types/api-responses/ouc-post';
import {
  createEmptyUserConfig,
  deleteUserConfigFile,
  listUsers,
  loadUserConfig,
} from '../config.js';
import {
  countUserEvents,
  createOucUserSession,
  deleteUserPin,
  ensureUserPins,
  listUserRows,
  patchUserProfile,
  purgeUserData,
  resolveUsernameByLoginId,
  setUserPin,
  updateLoginPin,
} from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { isPlausibleEmail, isSafeConfigUserId } from '../request-helpers.js';
import { consumePasswordResetToken, issuePasswordResetToken } from '../password-reset-token.js';
import { sessionTtlSeconds } from '../session-cookie.js';
import { sendInviteEmail } from '../invite-email.js';
import { generateTemporaryPassword } from '../temporary-password.js';
import { allocateUsernameForEmail } from '../username-from-email.js';
import { entitlementsForUser } from '../entitlements.js';

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
  deleteUserConfigFile(username);
  deleteUserPin(username);
}

function countConfiguredHabits(username: string): number {
  return loadUserConfig(username)?.habits.length ?? 0;
}

export const usersAdminRouter = Router();

usersAdminRouter.get('/users', requireAdmin, (_req: Request, res: Response) => {
  const usernames = listUsers();
  ensureUserPins(usernames);
  const rowsByUsername = new Map(listUserRows().map((row) => [row.username, row]));
  const users: ListUsersResponse['users'] = usernames.map((username) => {
    const row = rowsByUsername.get(username);
    return {
      username,
      displayName: row?.displayName ?? null,
      email: row?.email ?? '',
      lastLoginAt: row?.lastLoginAt ?? null,
      webAndApiVersion: row?.webAndApiVersion ?? null,
      habitCount: countConfiguredHabits(username),
      eventCount: countUserEvents(username),
      entitlements: entitlementsForUser(username),
    };
  });
  const body: ListUsersResponse = { users };
  res.json(body);
});

usersAdminRouter.post('/users/ouc', requireAdmin, (req: Request, res: Response) => {
  const name = typeof req.query.name === 'string' ? req.query.name : '';
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!isSafeConfigUserId(name)) {
    return res.status(400).json({ error: 'invalid user' });
  }

  const existing = listUsers();
  if (!existing.includes(name)) {
    return res.status(404).json({ error: 'user not found' });
  }

  ensureUserPins(existing);
  const token = createOucUserSession(name, sessionTtlSeconds());
  const body: CreateOucSessionResponse = { ok: true, user: name, token };
  return res.status(201).json(body);
});

usersAdminRouter.post(
  '/users',
  requireAdmin,
  async (req: Request<unknown, unknown, CreateUserRequest>, res: Response) => {
    const rawEmail = req.body?.email;
    if (typeof rawEmail !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }
    const email = rawEmail.trim().toLowerCase();
    if (!isPlausibleEmail(email)) {
      return res.status(400).json({ error: 'invalid email' });
    }
    if (resolveUsernameByLoginId(email)) {
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

    const name = allocateUsernameForEmail(email);
    if (!name) {
      return res.status(409).json({ error: 'could not allocate username' });
    }

    const password = generateTemporaryPassword();

    const out = createEmptyUserConfig(name);
    if (!out.ok) {
      const status = out.error.includes('already exists') ? 409 : 400;
      return res.status(status).json({ error: out.error });
    }

    setUserPin(out.user, password);
    try {
      patchUserProfile(out.user, {
        email,
        ...(displayName !== undefined ? { displayName } : {}),
      });
    } catch (e) {
      rollbackCreatedUser(out.user);
      const msg = e instanceof Error ? e.message : 'failed to save profile';
      return res.status(500).json({ error: msg });
    }

    if (sendInviteEmailFlag) {
      const { token, id: tokenId } = issuePasswordResetToken(out.user, 'invite');
      try {
        await sendInviteEmail(email, displayName!, token);
      } catch (e) {
        consumePasswordResetToken(tokenId);
        rollbackCreatedUser(out.user);
        const msg = e instanceof Error ? e.message : 'failed to send invite email';
        return res.status(500).json({ error: msg });
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
);

usersAdminRouter.patch('/users', requireAdmin, (req: Request, res: Response) => {
  const name = typeof req.query.name === 'string' ? req.query.name : '';
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!isSafeConfigUserId(name)) {
    return res.status(400).json({ error: 'invalid user' });
  }

  const existing = listUsers();
  if (!existing.includes(name)) {
    return res.status(404).json({ error: 'user not found' });
  }

  const password = generateTemporaryPassword();

  ensureUserPins(existing);
  if (!updateLoginPin(name, password)) {
    setUserPin(name, password);
  }

  const body = { ok: true as const, user: name, password };
  return res.json(body);
});

usersAdminRouter.delete('/users', requireAdmin, (req: Request, res: Response) => {
  const name = typeof req.query.name === 'string' ? req.query.name : '';
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!isSafeConfigUserId(name)) {
    return res.status(400).json({ error: 'invalid user' });
  }

  const existing = listUsers();
  if (!existing.includes(name)) {
    return res.status(404).json({ error: 'user not found' });
  }

  try {
    purgeUserData(name);
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : 'purge failed' });
  }

  const out = deleteUserConfigFile(name);
  if (!out.ok) {
    const status = out.error === 'user not found' ? 404 : 400;
    return res.status(status).json({ error: out.error });
  }

  deleteUserPin(out.user);
  return res.json({ ok: true, user: out.user });
});
