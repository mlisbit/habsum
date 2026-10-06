import type { TrackingProvider } from '../tracking-provider';

export class NoopTrackingProvider implements TrackingProvider {
  initialize(): void {
    // Intentionally empty: deployed clients do not send tracking data.
  }

  resolveIdentity(_username?: string): void {
    // Intentionally empty: deployed clients do not send tracking data.
  }

  track(_eventName: string): void {
    // Intentionally empty: deployed clients do not send tracking data.
  }
}
