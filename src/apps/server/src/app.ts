import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { configRouter } from './routes/users/config.routes.js';
import { dataRouter } from './routes/users/data.routes.js';
import { habitsRouter } from './routes/users/habits.routes.js';
import { securityRouter } from './routes/users/security.routes.js';
import { locationsRouter } from './routes/locations.routes.js';

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
  app.use(locationsRouter);
  app.use(usersRouter);
  app.use(securityRouter);
  app.use(habitsRouter);
  app.use(configRouter);
  app.use(dataRouter);

  return app;
}
