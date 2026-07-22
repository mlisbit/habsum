import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';

describe('GET /locations/typeahead', () => {
  it('returns local US and Canadian city options', async () => {
    const res = await request(createApp()).get('/locations/typeahead').query({ query: 'san' });

    expect(res.status).toBe(200);
    expect(res.body).toContainEqual({
      id: 'us-ca-san-francisco',
      name: 'San Francisco, CA, USA',
    });
    expect(res.body).toContainEqual({
      id: 'us-tx-san-antonio',
      name: 'San Antonio, TX, USA',
    });
  });
});
