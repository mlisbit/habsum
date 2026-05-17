import { Router, type Request, type Response } from 'express';
import type { CreateUserResponse, ListUsersResponse } from '@habsum/types/common/misc';
import { createUserFromSampleConfig, deleteUserConfigFile, listUsers } from '../config.js';
import { deleteUserPin, ensureUserPins, purgeUserData, setUserPin, updateLoginPin } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { isSafeConfigUserId, parsePin } from '../request-helpers.js';

export const usersAdminRouter = Router();

usersAdminRouter.get('/users', requireAdmin, (_req: Request, res: Response) => {
  const users = listUsers();
  ensureUserPins(users);
  const body: ListUsersResponse = { users };
  res.json(body);
});

usersAdminRouter.post('/users', requireAdmin, (req: Request, res: Response) => {
  const name = typeof req.query.name === 'string' ? req.query.name : '';
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!isSafeConfigUserId(name)) {
    return res.status(400).json({ error: 'invalid user' });
  }
  const pin = parsePin(req.body?.pin ?? '0');
  if (pin == null) return res.status(400).json({ error: 'pin is required' });

  const out = createUserFromSampleConfig(name);
  if (!out.ok) {
    const status = out.error.includes('already exists') ? 409 : 400;
    return res.status(status).json({ error: out.error });
  }

  setUserPin(out.user, pin);
  const body: CreateUserResponse = { ok: true, user: out.user };
  return res.status(201).json(body);
});

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

  const pin = parsePin(req.body?.pin ?? '0');
  if (pin == null) return res.status(400).json({ error: 'pin is required' });

  ensureUserPins(existing);
  if (!updateLoginPin(name, pin)) {
    setUserPin(name, pin);
  }
  return res.json({ ok: true, user: name });
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
