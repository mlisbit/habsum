import type { TrackingProvider } from '../tracking-provider';

const DEFAULT_SCRIPT_URL = 'https://cloud.umami.is/script.js';
const DEFAULT_WEBSITE_ID = 'f9e17d35-39a9-43e9-83d7-98c2dab13020';

type UmamiTracker = {
  identify: {
    (properties: { isAuthenticated: false }): void;
    (username: string, properties: { isAuthenticated: true }): void;
  };
  track: (eventName: string) => void;
};

type UmamiWindow = Window & {
  umami?: UmamiTracker;
};

export class UmamiTrackingProvider implements TrackingProvider {
  private readonly pendingClickNames: string[] = [];
  private pendingUsername: string | undefined;
  private hasPendingIdentity = false;
  private loadingScript: HTMLScriptElement | null = null;

  initialize(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined' || this.getTracker())
      return;

    const existingScript = this.getExistingScript();
    const script = existingScript ?? document.createElement('script');

    if (this.loadingScript !== script) {
      this.loadingScript = script;
      script.addEventListener(
        'load',
        () => {
          this.flushPendingIdentity();
          this.flushPendingClicks();
        },
        { once: true },
      );
    }

    if (existingScript) return;

    script.defer = true;
    script.src = DEFAULT_SCRIPT_URL;
    script.dataset.websiteId = DEFAULT_WEBSITE_ID;
    document.head.append(script);
  }

  resolveIdentity(username?: string): void {
    if (typeof window === 'undefined') return;

    const tracker = this.getTracker();
    if (tracker) {
      this.sendIdentity(tracker, username);
      return;
    }

    this.pendingUsername = username;
    this.hasPendingIdentity = true;
    this.initialize();
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

  private flushPendingIdentity(): void {
    const tracker = this.getTracker();
    if (!tracker || !this.hasPendingIdentity) return;

    const username = this.pendingUsername;
    this.pendingUsername = undefined;
    this.hasPendingIdentity = false;
    this.sendIdentity(tracker, username);
  }

  private sendClick(tracker: UmamiTracker, name: string): void {
    try {
      tracker.track(name);
    } catch {
      // Analytics must never interrupt the user action being tracked.
    }
  }

  private sendIdentity(tracker: UmamiTracker, username?: string): void {
    try {
      if (username !== undefined) {
        tracker.identify(username, { isAuthenticated: true });
        return;
      }

      tracker.identify({ isAuthenticated: false });
    } catch {
      // Analytics must never interrupt identity resolution.
    }
  }
}
