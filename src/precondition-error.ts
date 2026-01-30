export class PreconditionError extends Error {
  name = "PreconditionError";

  constructor(message: string) {
    super(message);
  }
}
