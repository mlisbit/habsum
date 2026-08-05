export interface TrackingProvider {
  initialize(): void;
  resolveIdentity(username?: string): void;
  track(eventName: string): void;
}
