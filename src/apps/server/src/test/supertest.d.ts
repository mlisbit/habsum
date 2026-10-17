declare module 'supertest' {
  import type { Application } from 'express';
  import type { Server } from 'node:http';

  export default function request(app: Application | Server): any;
}
