import getVersionWithDevOffset from '../utils/get-version-with-dev-offset.js';
import type { ApplicationUpdatesGetResponse } from '@habsum/types/api-responses/application-updates-get';
import { UpdateRepository, type UpdateRelease } from '../repositories/update-repository.js';
import ServiceError from '../utils/classes/service-error.js';
import isNewerVersion from '../utils/is-newer-version.js';

export class UpdateService {
  constructor(private readonly updateRepository = new UpdateRepository()) {}

  async getUpdates(webVersion: unknown): Promise<ApplicationUpdatesGetResponse> {
    if (typeof webVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(webVersion)) {
      throw new ServiceError('bad_request', 'webVersion must be a version in x.x.x format');
    }
    const offsetEnabled = process.env.HABSUM_DEV_VERSION_OFFSET === 'true';
    const updates: ApplicationUpdatesGetResponse = [];
    let release: UpdateRelease | null = null;
    try {
      release = await this.updateRepository.getLatestRelease();
    } catch (error) {
      console.error('[habsum] failed to check for updates', error);
      updates.push({ updateText: 'trouble checking for updates', url: null, style: 'warn' });
    }
    if (release) {
      const updateCandidate = getVersionWithDevOffset(release.version, offsetEnabled);
      if (isNewerVersion(updateCandidate, webVersion)) {
        updates.push({
          updateText: `update available v${updateCandidate}`,
          url: release.releaseNotesURI,
          style: 'info',
        });
      }
    }
    if (offsetEnabled) {
      updates.push({ updateText: 'fake', url: null, style: 'warn' });
    }
    return updates;
  }
}
