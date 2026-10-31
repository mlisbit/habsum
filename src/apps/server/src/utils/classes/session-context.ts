export default class SessionContext {
  constructor(
    readonly username: string,
    readonly sessionToken: string,
    readonly isDemoUser: boolean,
    readonly isOUCSession: boolean,
    readonly isAdmin: boolean,
  ) {}
}
