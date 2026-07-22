## Local server policy

- Never run `npm run dev`, `dev:ports:free`, `kill`, or `pkill`.
- Assume the application is already hosted and running.
- For browser testing, open the existing URL directly.
- Authenticated pages require an existing login cookie. Agents do not have one by default, so a
  redirect to the logged-out homepage or login page does not mean the application is unreachable.
- Do not attempt to bypass login or create a session for browser testing. If an authenticated page
  must be tested and no signed-in browser session is available, report that limitation and rely on
  automated tests unless the user explicitly provides access.
- If the page is unreachable, stop and ask instead of starting or restarting servers.
