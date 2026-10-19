# @habsum/tracking

Client and server side tracking.

## Client side tracking

You may notice there's not actual "provider" for client side tracking; just "noop" and "console".

- **NoopTrackingProvider**: does nothing with client side tracking events
- **ConsoleTrackingProvider**: outputs the tracking calls to the console.

At one point there was another provider, but because this is a self hosted application, it was removed. I kept the infrastructure because;

- console tracking provider can be helpful for client side debugging.
- a "demo" build of the application could choose to implement tracking.

### Implementation details

Client tracking is implemented as a provider
interface, exposed through a React context and the `useTracking()` hook. A typed `TrackingSpec` defines the click events, and `trackClick()` forwards them to the provider.

Here's an example:

```tsx
import { TrackingContextProvider, useTracking } from '@habsum/tracking/client/react';
import { TrackingSpec } from '@habsum/tracking/client/spec';
import { ConsoleTrackingProvider } from '@habsum/tracking/client/providers/console';

const spec = new TrackingSpec({ clicks: { 'login-click': 'login-click' } });
const provider = new ConsoleTrackingProvider();

function LoginButton() {
  const tracking = useTracking<typeof spec>();
  return <button onClick={() => tracking.trackClick('login-click')}>Log in</button>;
}

function App() {
  return (
    <TrackingContextProvider provider={provider} spec={spec}>
      <LoginButton />
    </TrackingContextProvider>
  );
}
```

## Server side tracking

You can think about server-side tracking as a more strict extension of client side tracking;

For example; a user adding an event toward a goal -- a web client doesnt actually know if the event is persisted. The server could have thrown an error preventing the save. Thus a "add click event" would not represent the true number of update events in a db. Server side errors resolve this discrepency by firing events server side after a sucessful completion.

If you wanted to know error rates acroess the application, you can figure it out by comparing a server event to its equivelant client side event.

Server side tracking, imilarly to client-side tracking, remains in a kind limbo state. I can see it being helpful, but it's not being prioritized.

Here's an example:

```ts
import { Logger } from '@habsum/tracking/server/logger';

const logger = new Logger();

logger.logEvent({
  name: 'HabitAction',
  body: { habitType: 'summation' },
});
```

Which will output this to the console. There will be future work done to persist this to a log file.

```json
{ "name": "HabitAction", "body": { "habitType": "summation" } }
```
