export interface TrackingProvider {
  initialize(): void;
  track(eventName: string): void;
}
