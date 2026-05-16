import type { ServerTimeResponse } from '../common/misc';

export type DeveloperVersionResponse = {
  currentVersion: string;
};

export type DeveloperGetResponse = {
  time: ServerTimeResponse;
  version: DeveloperVersionResponse;
};
