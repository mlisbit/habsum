import { Router, type Request, type Response } from 'express';
import type {
  CreateUserRequest,
  CreateUserResponse,
  ListUsersResponse,
} from '@habsum/types/common/misc';
import type { CreateOucSessionResponse } from '@habsum/types/api-responses/ouc-post';
import { createUserFromSampleConfig, deleteUserConfigFile, listUsers } from '../config.js';
import {
  createOucUserSession,
  deleteUserPin,
  ensureUserPins,
  isEmailUsedByOtherUser,
  patchUserProfile,
  purgeUserData,
  resolveUsernameByLoginId,
  setUserForcePasswordReset,
  setUserPin,
  updateLoginPin,
} from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { isPlausibleEmail, isSafeConfigUserId } from '../request-helpers.js';
import { sessionTtlSeconds } from '../session-cookie.js';
import { generateTemporaryPassword } from '../temporary-password.js';
import { allocateUsernameForEmail } from '../username-from-email.js';

export const usersAdminRouter = Router();

usersAdminRouter.get('/users', requireAdmin, (_req: Request, res: Response) => {
  const users = listUsers();
  ensureUserPins(users);
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
  (req: Request<unknown, unknown, CreateUserRequest>, res: Response) => {
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

    const name = allocateUsernameForEmail(email);
    if (!name) {
      return res.status(409).json({ error: 'could not allocate username' });
    }

    const password = generateTemporaryPassword();

    const out = createUserFromSampleConfig(name);
    if (!out.ok) {
      const status = out.error.includes('already exists') ? 409 : 400;
      return res.status(status).json({ error: out.error });
    }

    setUserPin(out.user, password);
    try {
      patchUserProfile(out.user, { email });
    } catch (e) {
      deleteUserConfigFile(out.user);
      deleteUserPin(out.user);
      const msg = e instanceof Error ? e.message : 'failed to save profile';
      return res.status(500).json({ error: msg });
    }
    setUserForcePasswordReset(out.user, true);

    const body: CreateUserResponse = { ok: true, user: out.user, password };
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
  setUserForcePasswordReset(name, true);

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
