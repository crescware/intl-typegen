import { PreconditionError } from "./precondition-error";

export function assertExists<T>(value: T): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new PreconditionError("Expected value to exist");
  }
}
