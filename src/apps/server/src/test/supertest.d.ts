declare module 'supertest' {
  import type { Application } from 'express';

  export default function request(app: Application): any;
}
