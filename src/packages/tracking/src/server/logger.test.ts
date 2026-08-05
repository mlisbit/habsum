import { afterEach, describe, expect, it, vi } from 'vitest';

import { Logger } from './logger';

describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs a server event as one line of JSON', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const logger = new Logger();

    logger.logEvent({
      name: 'HabitAction',
      body: { habitType: 'summation' },
    });

    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({ name: 'HabitAction', body: { habitType: 'summation' } }),
    );
  });
});
