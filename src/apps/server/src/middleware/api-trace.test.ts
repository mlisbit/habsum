import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import apiTrace from './api-trace.js';
import { createApp } from '../app.js';

beforeEach(() => {
  vi.stubEnv('HABSUM_LOG_FORMAT', 'json');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it('logs parsed request data and the complete final JSON response', async () => {
  vi.stubEnv('HABSUM_DEBUG', 'TRACE');
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const app = express();
  app.use(apiTrace);
  app.use(express.json());
  app.post('/example', (req, res) => res.status(201).json({ received: req.body }));
  const data = { nested: { value: 'example' } };
  await request(app).post('/example?view=full').send(data).expect(201, { received: data });
  expect(log).toHaveBeenCalledExactlyOnceWith(
    '[habsum] API TRACE',
    JSON.stringify({
      request: { url: '/example?view=full', method: 'POST', data },
      response: { statusCode: 201, data: { received: data } },
    }),
  );
});

it('captures streamed response chunks once and preserves the response', async () => {
  vi.stubEnv('HABSUM_DEBUG', 'TRACE');
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const app = express();
  app.use(apiTrace);
  app.get('/stream', (_req, res) => {
    res.write('first ', 'utf8');
    res.end(Buffer.from('last'));
  });
  await request(app).get('/stream').expect(200, 'first last');
  expect(log).toHaveBeenCalledExactlyOnceWith(
    '[habsum] API TRACE',
    JSON.stringify({
      request: { url: '/stream', method: 'GET' },
      response: { statusCode: 200, data: 'first last' },
    }),
  );
});

it.each(['/unknown-trace-route', '/users/me/settings'])(
  'traces final API errors for %s',
  async (url) => {
    vi.stubEnv('HABSUM_DEBUG', 'TRACE');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const response = await request(createApp()).get(url);
    const call = log.mock.calls.find(([label]) => label === '[habsum] API TRACE');
    const trace = JSON.parse(call![1]);
    expect(trace.request).toEqual({ url, method: 'GET', data: {} });
    expect(trace.response.statusCode).toBe(response.status);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(trace.response.data).toEqual(
      response.type === 'application/json' ? response.body : response.text,
    );
  },
);

it.each([undefined, 'DEBUG', 'trace'])('does not trace when HABSUM_DEBUG is %s', async (level) => {
  vi.stubEnv('HABSUM_DEBUG', level);
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await request(createApp()).get('/auth/status').expect(200);
  expect(log).not.toHaveBeenCalled();
});

it.each([200, 201, 204, 400, 500])(
  'pretty prints TRACE responses with status %s',
  async (status) => {
    vi.stubEnv('HABSUM_DEBUG', 'TRACE');
    vi.stubEnv('HABSUM_LOG_FORMAT', 'pretty');
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    vi.spyOn(Date.prototype, 'getMinutes').mockReturnValue(5);
    vi.spyOn(Date.prototype, 'getSeconds').mockReturnValue(3);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = express();
    app.use(apiTrace);
    const data = { habits: [{ id: 1, name: 'Exercise' }] };
    app.get('/api/habits', (_req, res) => res.status(status).json(data));

    await request(app).get('/api/habits').expect(status);
    const coloredStatus = status < 300 ? `\u001b[32m${status}\u001b[0m` : String(status);
    expect(log).toHaveBeenCalledExactlyOnceWith(
      `\u001b[33m09:05:03 TRACE GET /api/habits → \u001b[0m${coloredStatus}\n${status === 204 ? '' : JSON.stringify(data, null, 2)}`,
    );
  },
);

it('retains request data in pretty logs', async () => {
  vi.stubEnv('HABSUM_DEBUG', 'TRACE');
  vi.stubEnv('HABSUM_LOG_FORMAT', 'pretty');
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const app = express();
  app.use(apiTrace);
  app.use(express.json());
  app.post('/example', (_req, res) => res.json({ ok: true }));
  await request(app).post('/example').send({ name: 'Exercise' }).expect(200);
  expect(log.mock.calls[0][0]).toContain('Request data:\n{\n  "name": "Exercise"\n}');
});
