import type { TrackingProvider } from '../tracking-provider';

const DEFAULT_SCRIPT_URL = 'https://cloud.umami.is/script.js';
const DEFAULT_WEBSITE_ID = 'f9e17d35-39a9-43e9-83d7-98c2dab13020';

type UmamiTracker = {
  track: (eventName: string) => void;
};

type UmamiWindow = Window & {
  umami?: UmamiTracker;
};

export class UmamiTrackingProvider implements TrackingProvider {
  private readonly pendingClickNames: string[] = [];
  private loadingScript: HTMLScriptElement | null = null;

  initialize(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined' || this.getTracker())
      return;

    const existingScript = this.getExistingScript();
    const script = existingScript ?? document.createElement('script');

    if (this.loadingScript !== script) {
      this.loadingScript = script;
      script.addEventListener('load', () => this.flushPendingClicks(), { once: true });
    }

    if (existingScript) return;

    script.defer = true;
    script.src = DEFAULT_SCRIPT_URL;
    script.dataset.websiteId = DEFAULT_WEBSITE_ID;
    document.head.append(script);
  }

  track(eventName: string): void {
    if (typeof window === 'undefined') return;

    const tracker = this.getTracker();
    if (tracker) {
      this.sendClick(tracker, eventName);
      return;
    }

    this.pendingClickNames.push(eventName);
    this.initialize();
  }

  private getExistingScript(): HTMLScriptElement | undefined {
    return Array.from(document.scripts).find(
      (script) => script.dataset.websiteId === DEFAULT_WEBSITE_ID,
    );
  }

  private getTracker(): UmamiTracker | undefined {
    if (typeof window === 'undefined') return undefined;

    return (window as UmamiWindow).umami;
  }

  private flushPendingClicks(): void {
    const tracker = this.getTracker();
    if (!tracker) return;

    const names = this.pendingClickNames.splice(0);
    names.forEach((name) => this.sendClick(tracker, name));
  }

  private sendClick(tracker: UmamiTracker, name: string): void {
    try {
      tracker.track(name);
    } catch {
      // Analytics must never interrupt the user action being tracked.
    }
  }
}
