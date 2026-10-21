import type { ApplicationGetResponse } from '@habsum/types/api-responses/application-get';
import { DatabaseRepository } from '../repositories/database-repository.js';
import { ApplicationSettingsRepository } from '../repositories/application-settings-repository.js';
import { getApiServerTimeSnapshot } from '../utils/server-time-utils.js';
import isDemoEnabled from '../utils/is-demo-enabled.js';
import { AuthService } from './auth-service.js';

export class ApplicationService {
  constructor(
    private readonly authService = new AuthService(),
    private readonly databaseRepository = new DatabaseRepository(),
    private readonly applicationSettingsRepository = new ApplicationSettingsRepository(),
  ) {}

  getApplication(): ApplicationGetResponse {
    const demoEnabled = isDemoEnabled();
    const demoUser = this.applicationSettingsRepository.getDemoUser();

    return {
      ...this.authService.getStatus(),
      demoEnabled,
      demoUser:
        demoEnabled && demoUser.username.trim() && demoUser.password.trim() ? demoUser : null,
      serverTime: getApiServerTimeSnapshot(),
      database: { path: this.databaseRepository.getPath() },
    };
  }
}
