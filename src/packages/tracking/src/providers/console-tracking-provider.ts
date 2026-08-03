import type { TrackingProvider } from '../tracking-provider';

export class ConsoleTrackingProvider implements TrackingProvider {
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;

    this.initialized = true;
    console.log('[tracking] initialized');
  }

  track(eventName: string): void {
    console.log('[tracking] event', eventName);
  }
}
