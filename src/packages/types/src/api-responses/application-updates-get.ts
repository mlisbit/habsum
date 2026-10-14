export type ApplicationUpdate = {
  updateText: string;
  url: string | null;
  style: 'info' | 'warn';
};

export type ApplicationUpdatesGetResponse = ApplicationUpdate[];
