import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { accountRouter } from './routes/users/account.routes.js';
import { configRouter } from './routes/users/config.routes.js';
import { dataRouter } from './routes/users/data.routes.js';
import { habitsRouter } from './routes/users/habits.routes.js';
import { securityRouter } from './routes/users/security.routes.js';
import { administratorRouter } from './routes/administrator.routes.js';
import apiTrace from './middleware/api-trace.js';
import sessionContextMiddleware from './middleware/session-context-middleware.js';

export function createApp(): express.Application {
  const app = express();
  app.use(apiTrace);
  app.use(sessionContextMiddleware);
  app.param('user', sessionContextMiddleware);
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.use(publicRouter);
  app.use(administratorRouter);
  app.use(authRouter);
  app.use(usersRouter);
  app.use('/users/:user', accountRouter, securityRouter, habitsRouter, configRouter, dataRouter);

  return app;
}
