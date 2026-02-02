/**
 * ICU message format parse error. The translation string contains invalid ICU syntax.
 */
export class IcuParseError extends Error {
  name = "IcuParseError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
