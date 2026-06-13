/**
 * Error thrown by the praxis HTTP transport. Carries the wire status code and
 * the machine-dispatchable `ErrorBody.code` (open set; may be empty) so callers
 * can branch on them. Lives in its own module to avoid an import cycle between
 * client.ts and http-client.ts.
 */
export class PraxisError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "PraxisError";
  }
}
