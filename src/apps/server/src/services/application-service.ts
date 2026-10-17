import type { ApplicationGetResponse } from '@habsum/types/api-responses/application-get';
import { DatabaseRepository } from '../repositories/database-repository.js';
import { getApiServerTimeSnapshot } from '../utils/server-time-utils.js';
import isDemoEnabled from '../utils/is-demo-enabled.js';
import { AuthService } from './auth-service.js';

export class ApplicationService {
  constructor(
    private readonly authService = new AuthService(),
    private readonly databaseRepository = new DatabaseRepository(),
  ) {}

  getApplication(): ApplicationGetResponse {
    return {
      ...this.authService.getStatus(),
      demoEnabled: isDemoEnabled(),
      serverTime: getApiServerTimeSnapshot(),
      database: { path: this.databaseRepository.getPath() },
    };
  }
}
