import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth-routes.js';
import { publicRouter } from './routes/public.js';
import { userScopedRouter } from './routes/user-scoped.js';
import { usersAdminRouter } from './routes/users-admin.js';

export function createApp(): express.Application {
  const app = express();
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.use(publicRouter);
  app.use(authRouter);
  app.use(usersAdminRouter);
  app.use('/users/:user', userScopedRouter);

  return app;
}
