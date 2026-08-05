import type { TrackingProvider } from '../tracking-provider';

export class ConsoleTrackingProvider implements TrackingProvider {
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;

    this.initialized = true;
    console.log('[tracking] initialized');
  }

  resolveIdentity(username?: string): void {
    console.log('[tracking] identity', username);
  }

  track(eventName: string): void {
    console.log('[tracking] event', eventName);
  }
}
