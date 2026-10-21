import type { RequestHandler } from 'express';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import getDemoRestrictionContext from '../utils/get-demo-restriction-context.js';

const userAndAuthRepository = new UserAndAuthRepository();

export const resolveForgotPasswordAccount: RequestHandler = (req, _res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const username = email ? userAndAuthRepository.resolveUsernameByLoginId(email) : null;
  const context = getDemoRestrictionContext();
  context.run(
    {
      user: context.getStore()?.user ?? null,
      passwordRecovery: {
        kind: 'forgot',
        email,
        account: username ? { username, admin: userAndAuthRepository.isUserAdmin(username) } : null,
      },
    },
    next,
  );
};

export const resolveResetPasswordAccount: RequestHandler = (req, _res, next) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const resetToken = token ? userAndAuthRepository.lookupValidPasswordResetToken(token) : null;
  const context = getDemoRestrictionContext();
  context.run(
    {
      user: context.getStore()?.user ?? null,
      passwordRecovery: {
        kind: 'reset',
        token,
        resetToken,
        account: resetToken
          ? {
              username: resetToken.userId,
              admin: userAndAuthRepository.isUserAdmin(resetToken.userId),
            }
          : null,
      },
    },
    next,
  );
};
