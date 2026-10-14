import { UpdateRepository } from '../../repositories/update-repository.js';
import request from 'supertest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import getPackageVersion from '../../utils/get-package-version.js';

const currentVersion = getPackageVersion();
const [major, minor] = currentVersion.split('.').map(Number);
const updateCandidate = `${major}.${minor + 1}.0`;
const releaseNotesURI = `https://github.com/mlisbit/habsum/releases/tag/v${updateCandidate}`;

beforeEach(() => {
  vi.stubEnv('HABSUM_DEV_VERSION_OFFSET', 'false');
  vi.spyOn(UpdateRepository.prototype, 'getLatestRelease').mockResolvedValue({
    version: updateCandidate,
    releaseNotesURI,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it('returns one informational entry with server-provided text and the real release link', async () => {
  await request(createApp())
    .get(`/application/updates?webVersion=${currentVersion}`)
    .expect(200, [
      { updateText: `update available v${updateCandidate}`, url: releaseNotesURI, style: 'info' },
    ]);
});

it.each([updateCandidate, `${major + 1}.0.0`])(
  'returns no entries for up-to-date or newer web version %s',
  async (webVersion) => {
    await request(createApp()).get(`/application/updates?webVersion=${webVersion}`).expect(200, []);
  },
);

it('returns only an informational update even when web and API versions differ', async () => {
  await request(createApp())
    .get('/application/updates?webVersion=0.0.0')
    .expect(200, [
      { updateText: `update available v${updateCandidate}`, url: releaseNotesURI, style: 'info' },
    ]);
});

it.each(['', '?webVersion=invalid', '?webVersion=1.2', '?webVersion=1.2.3&webVersion=2.3.4'])(
  'rejects missing or malformed webVersion: %s',
  async (query) => {
    await request(createApp()).get(`/application/updates${query}`).expect(400, {
      error: 'webVersion must be a version in x.x.x format',
    });
  },
);

it('removes the former version endpoint', async () => {
  await request(createApp()).get('/application/version').expect(404);
});

it('reports no update when no published release exists', async () => {
  vi.mocked(UpdateRepository.prototype.getLatestRelease).mockResolvedValue(null);
  await request(createApp())
    .get(`/application/updates?webVersion=${currentVersion}`)
    .expect(200, []);
});

it.each(['false', 'true'])(
  'returns a warning and logs the original GitHub error with offset=%s',
  async (offset) => {
    vi.stubEnv('HABSUM_DEV_VERSION_OFFSET', offset);
    const error = new Error('Rate limited');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(UpdateRepository.prototype.getLatestRelease).mockRejectedValue(error);
    const app = createApp();
    await request(app)
      .get(`/application/updates?webVersion=${currentVersion}`)
      .expect(200, [
        { updateText: 'trouble checking for updates', url: null, style: 'warn' },
        ...(offset === 'true' ? [{ updateText: 'fake', url: null, style: 'warn' }] : []),
      ]);
    expect(log).toHaveBeenCalledExactlyOnceWith('[habsum] failed to check for updates', error);
    await request(app).get('/health').expect(200, { ok: true });
  },
);

it('simulates a patch update from GitHub while linking to the actual published release', async () => {
  vi.stubEnv('HABSUM_DEV_VERSION_OFFSET', 'true');
  const releaseNotesURI = `https://github.com/mlisbit/habsum/releases/tag/v${currentVersion}`;
  vi.mocked(UpdateRepository.prototype.getLatestRelease).mockResolvedValue({
    version: currentVersion,
    releaseNotesURI,
  });
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  await request(createApp())
    .get(`/application/updates?webVersion=${currentVersion}`)
    .expect(200, [
      {
        updateText: `update available v${major}.${minor}.${patch + 1}`,
        url: releaseNotesURI,
        style: 'info',
      },
      { updateText: 'fake', url: null, style: 'warn' },
    ]);
});

it('does not fabricate an update if GitHub has no release even with the flag enabled', async () => {
  vi.stubEnv('HABSUM_DEV_VERSION_OFFSET', 'true');
  vi.mocked(UpdateRepository.prototype.getLatestRelease).mockResolvedValue(null);
  const response = await request(createApp())
    .get(`/application/updates?webVersion=${currentVersion}`)
    .expect(200);
  expect(response.body).toEqual([{ updateText: 'fake', url: null, style: 'warn' }]);
});

it('returns the override warning even when the client is newer than the offset release', async () => {
  vi.stubEnv('HABSUM_DEV_VERSION_OFFSET', 'true');
  await request(createApp())
    .get(`/application/updates?webVersion=${major + 1}.0.0`)
    .expect(200, [{ updateText: 'fake', url: null, style: 'warn' }]);
});
