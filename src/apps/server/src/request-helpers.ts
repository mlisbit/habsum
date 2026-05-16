import type { Response } from 'express';
import { loadUserConfig, ConfigValidationError } from './config.js';

export function isSafeConfigUserId(user: string): boolean {
  if (user.length === 0 || user.length > 200) return false;
  if (/[/\\]/.test(user) || user.includes('..')) return false;
  return true;
}

export function parsePin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const pin = value.trim();
  return pin.length > 0 ? pin : null;
}

export function loadUserConfigForResponse(user: string, res: Response) {
  try {
    const config = loadUserConfig(user);
    if (!config) {
      res.status(404).json({ error: 'user not found' });
    }
    return config;
  } catch (e) {
    if (e instanceof ConfigValidationError) {
      res.status(400).json({ error: e.message });
      return null;
    }
    throw e;
  }
}
