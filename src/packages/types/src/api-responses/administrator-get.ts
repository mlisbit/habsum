import type { ServerTimeResponse } from '../common/misc';

export type AdministratorVersionResponse = {
  currentVersion: string;
};

export type AdministratorGetResponse = {
  time: ServerTimeResponse;
  version: AdministratorVersionResponse;
};
