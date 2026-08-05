import type { ServerEvent } from './server-event';

export class Logger {
  logEvent(event: ServerEvent): void {
    console.log(JSON.stringify(event));
  }
}
