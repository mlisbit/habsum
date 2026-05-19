import type { DayWithTime } from '../common/day.js';

/** One logged-in session (cookie token value is never exposed). */
export type SecurityGetSession = {
  /** Short random id derived from the session (first 8 hex chars of the stored token). */
  token: string;
  createdAt: DayWithTime;
  expiresAt: DayWithTime;
  /** True when this row matches the HttpOnly session cookie on the current request. */
  isActive: boolean;
};

/** GET /users/:user/security — sessions for the authenticated user. */
export type SecurityGetResponse = {
  sessions: SecurityGetSession[];
};
