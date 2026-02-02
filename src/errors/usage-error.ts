/**
 * User-correctable error. The user can take action to fix the problem.
 */
export class UsageError extends Error {
  name = "UsageError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
