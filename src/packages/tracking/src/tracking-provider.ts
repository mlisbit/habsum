import type { TrackingClickName } from './tracking-click-name';

export interface TrackingProvider {
  initialize(): void;
  trackClick(name: TrackingClickName): void;
}
