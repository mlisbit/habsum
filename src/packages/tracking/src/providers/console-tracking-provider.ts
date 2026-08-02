import type { TrackingClickName } from '../tracking-click-name';
import type { TrackingProvider } from '../tracking-provider';

export class ConsoleTrackingProvider implements TrackingProvider {
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;

    this.initialized = true;
    console.log('[tracking] initialized');
  }

  trackClick(name: TrackingClickName): void {
    console.log('[tracking] click', name);
  }
}
