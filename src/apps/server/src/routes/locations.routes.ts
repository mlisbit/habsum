import { Router } from 'express';
import { locationsController } from './locations.controller.js';

export const locationsRouter = Router();

// Used by typeahead fields to search the built-in US and Canada city list.
locationsRouter.get('/locations/typeahead', locationsController.getTypeahead);
