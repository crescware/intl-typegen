/**
 * Internal programming error. Calling code violated an API contract.
 */
export class PreconditionError extends Error {
  name = "PreconditionError";

  constructor(message: string) {
    super(message);
  }
}
