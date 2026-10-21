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
    const demoEnabled = isDemoEnabled();
    const username = process.env.HABSUM_DEMO_USERNAME;
    const password = process.env.HABSUM_DEMO_PASSWORD;

    return {
      ...this.authService.getStatus(),
      demoEnabled,
      demoUser: demoEnabled && username && password ? { username, password } : null,
      serverTime: getApiServerTimeSnapshot(),
      database: { path: this.databaseRepository.getPath() },
    };
  }
}
