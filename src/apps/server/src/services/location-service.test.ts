import { describe, expect, it } from 'vitest';
import { LocationService } from './location-service.js';

describe('LocationService', () => {
  it('always returns a promise and searches the built-in city list', async () => {
    const service = new LocationService();
    const result = service.locationTypeahead('toronto');

    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toEqual([{ id: 'ca-on-toronto', name: 'Toronto, ON, Canada' }]);
  });

  it('returns popular cities for an empty query', async () => {
    const result = await new LocationService().locationTypeahead();

    expect(result).toContainEqual({ id: 'us-fl-tampa', name: 'Tampa, FL, USA' });
    expect(result).toContainEqual({ id: 'ca-on-toronto', name: 'Toronto, ON, Canada' });
    expect(result).toContainEqual({
      id: 'us-ca-san-francisco',
      name: 'San Francisco, CA, USA',
    });
  });
});
