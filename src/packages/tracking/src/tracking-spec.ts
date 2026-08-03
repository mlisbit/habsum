import type { TrackingProvider } from './tracking-provider';

type TrackingClicks = Readonly<Record<string, string>>;

type MatchingTrackingClicks<TClicks extends TrackingClicks> = {
  readonly [TName in keyof TClicks]: TName;
};

export class TrackingSpec<const TClicks extends TrackingClicks = TrackingClicks> {
  readonly clicks: TClicks & MatchingTrackingClicks<TClicks>;

  constructor({ clicks }: { clicks: TClicks & MatchingTrackingClicks<TClicks> }) {
    this.clicks = clicks;
  }
}

export type TrackingClickName<TSpec extends TrackingSpec> = keyof TSpec['clicks'] & string;

export class TrackingService<TSpec extends TrackingSpec = TrackingSpec> {
  constructor(
    private readonly provider: TrackingProvider,
    private readonly spec: TSpec,
  ) {}

  readonly resolveIdentity = (username?: string): void => {
    this.provider.resolveIdentity(username);
  };

  trackClick(name: TrackingClickName<TSpec>): void {
    this.provider.track(this.spec.clicks[name]);
  }
}
