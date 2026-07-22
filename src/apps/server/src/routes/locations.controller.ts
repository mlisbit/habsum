import type { LocationTypeaheadResponse } from '@habsum/types/common/location';
import type { Request, Response } from 'express';
import { LocationService } from '../services/location-service.js';

const locationService = new LocationService();

export const locationsController = {
  async getTypeahead(req: Request, res: Response) {
    const query = typeof req.query.query === 'string' ? req.query.query : '';
    const body: LocationTypeaheadResponse = await locationService.locationTypeahead(query);
    return res.json(body);
  },
};
